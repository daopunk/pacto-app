# Local Anvil development setup

This document explains how the embedded wallet uses a local Anvil node (chain ID `31337`) for development and how it is kept out of production builds.

## What the local stack provides

When running the companion `pacto-dev-env` Docker stack:

| Service | URL | Purpose |
|---------|-----|---------|
| Anvil EVM testnet | `http://localhost:8545` | Fast, deterministic, free EVM state for balances, sends, and contract deploys. |
| Nostr relay | `ws://localhost:7000` | Isolated relay for DM wallet messages and bot development. |

## How the app discovers the local stack

In **Vite dev builds** (`import.meta.env.DEV`), the app automatically wires the local stack into a newly unlocked account. This runs once per account per app session:

1. Adds `ws://localhost:7000` as a custom Nostr relay if it is missing.
2. Enables the `Local Anvil` chain in Settings → EVM.
3. Sets the default RPC for `Local Anvil` to `http://localhost:8545` if none is set.

Existing user changes are never overwritten. The marker that tracks whether defaults have been applied is stored in `sessionStorage`, so it resets when the app restarts.

This logic lives in `src/lib/dev/local-dev-setup.ts` and is invoked from account create / import / unlock flows in `src/stores/auth.ts`.

## Where `local` is defined

### Frontend

- `src/lib/wallet/chains.ts` — maps `local` to the viem `anvil` chain (chain ID `31337`) and accepts `anvil` as an alias.
- `src/lib/wallet/assets.ts` — adds `local` as a chain group and loads metadata from `src/lib/wallet/wallet-assets.json`.
- `src/lib/wallet/rpc-catalog.ts` — curated default RPC: `http://localhost:8545`.
- `src/lib/wallet/wallet-ui-prefs.ts` — enabled-chains list; `local` is only included in dev builds.
- `src/lib/wallet/rpc-prefs.ts` — `local` RPC prefs are ignored in production builds.
- `src/lib/wallet/dm-messages.ts` — accepts `local` and `anvil` as valid DM wallet message network values.
- `src/lib/dashboard/structure-summary.ts` — displays `Local Anvil` for dashboard items on chain `local`.

### Backend

- `src-tauri/src/evm/wallet_chain_config.rs` — loads `wallet-assets.json`, assigns chain ID `31337`, and sets the default RPC to `http://localhost:8545`.
- `src-tauri/src/lib.rs` — relay URL validator allows `ws://` only for `localhost` / `127.0.0.1` with a port.
- `src-tauri/src/db.rs` — normalizes `local` / `anvil` treasury chain values to `local`.

## Build gating

`Local Anvil` is a **dev-only** network. Two mechanisms keep it out of production builds:

1. **TypeScript:** `import.meta.env.DEV` guards the auto-wiring logic, enabled-chain defaults, and RPC prefs. Production builds never show `Local Anvil` in Settings or persist local RPC URLs.
2. **Rust:** `NETWORK_KEYS` in `wallet_chain_config.rs` includes `local` only under `#[cfg(any(debug_assertions, test))]`. In release builds, `wallet_networks()` omits `local` and `network_by_key("local")` returns `None`.

## Manual setup (when auto-wiring is skipped or fails)

If the relay is not running when the account unlocks, the auto-wiring logs a warning and continues. You can configure the stack manually:

1. **Start the Docker services:**

   ```bash
   cd pacto-dev-env
   docker compose up -d --build
   ```

2. **Add the local relay:**
   - Settings → Nostr → Add custom relay
   - URL: `ws://localhost:7000`
   - Mode: Read & write

3. **Enable Local Anvil:**
   - Settings → EVM → Enabled chains → toggle `Local Anvil`

4. **Set the default RPC:**
   - Settings → EVM → RPC endpoints → Network: `Local Anvil`
   - Add `http://localhost:8545` and select it as default.

## Importing the default Anvil account

Anvil account #0 is funded on a fresh node and is useful for testing sends and contract interactions:

```text
Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

In Settings → EVM → EVM accounts, choose **Import private key** and paste the key. It imports as an **Advanced account**.

## Deploying pacto-gov contracts locally

The app reads contract addresses from `src/lib/evm/pacto-protocol-addresses.json` at compile time. For local testing you must deploy the contracts and add a `"local"` network block.

From the `pacto-gov` repo:

```bash
forge install
forge build
forge script Deploy --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast --chain 31337 -vvvvv
```

After broadcast, copy the addresses from `pacto-gov/deployments/31337/full-system.json` into `src/lib/evm/pacto-protocol-addresses.json` under `"local"`. Alternatively, export the corresponding `PACTO_*` env vars before running the Tauri app.

## Security notes

- The Anvil account #0 private key is public. Use it only on a local Anvil node.
- `http://localhost:8545` and `ws://localhost:7000` are unencrypted local endpoints. Do not expose them to a network.
- Local contract addresses are not portable across Anvil restarts. When Anvil restarts, redeploy and update the address book.

## Verification

After setup:

- `curl http://localhost:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'` returns `0x7a69`.
- Settings → Nostr shows `ws://localhost:7000` connected.
- Settings → EVM → RPC endpoints shows `Local Anvil` defaulting to `http://localhost:8545`.
- The imported Anvil account shows a non-zero ETH balance.

## Files to review when changing local behavior

- `src/lib/dev/local-dev-setup.ts`
- `src/lib/wallet/chains.ts`
- `src/lib/wallet/assets.ts`
- `src/lib/wallet/wallet-ui-prefs.ts`
- `src/lib/wallet/rpc-prefs.ts`
- `src/lib/wallet/rpc-catalog.ts`
- `src/lib/wallet/dm-messages.ts`
- `src/lib/wallet/wallet-assets.json`
- `src-tauri/src/evm/wallet_chain_config.rs`
- `src-tauri/src/lib.rs`
- `src/lib/evm/pacto-protocol-addresses.json`
