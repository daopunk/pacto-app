## Issue: Add a local Anvil chain (chain ID 31337) to the embedded wallet

### Summary

Add a first-class `local` / `Anvil` chain configuration to `pacto-app` so developers can point the embedded wallet at a local node (`http://localhost:8545`) directly from **Settings → EVM**.

### Motivation

- Local development and integration testing currently require pointing the wallet at a public testnet (Sepolia), which is slow, rate-limited, and consumes test ETH.
- Anvil (Foundry) is the standard local EVM environment; supporting chain ID `31337` lets contributors run the full wallet UI against a local node with zero configuration beyond starting Anvil.

### Proposed network definition

| Field | Value |
|-------|-------|
| Network key | `local` |
| Display name | `Local Anvil` |
| Chain ID | `31337` |
| Default RPC | `http://localhost:8545` |
| Native asset | ETH, 18 decimals |
| USDC / USDT | Zero-address placeholders (`0x0000…0000`) until local mocks are deployed |

### Files to modify

1. `src/lib/wallet/chains.ts` — define an inline `anvil` viem chain, add `local` to `SUPPORTED_CHAINS`, update `parseSupportedChainId`, and add a Safe-app prefix entry.
2. `src/lib/wallet/wallet-assets.json` — add a `local` network row with native ETH and zero-address USDC/USDT placeholders.
3. `src/lib/wallet/assets.ts` — add `local` to `WALLET_ASSETS_CHAIN_IDS`, extend `WalletChainGroupId`, and add a `Local` group.
4. `src/lib/wallet/rpc-catalog.ts` — add `local: ['http://localhost:8545']` to curated defaults.
5. `src/lib/wallet/rpc-prefs.ts` — add missing `import type { SupportedChainId } from './chains';` (minor type-cleanup).
6. `src/lib/wallet/dm-messages.ts` — allow `local` in DM wallet message payloads.
7. `src/lib/dashboard/structure-summary.ts` — add `case 'local'` to keep the chain display-name switch exhaustive.
8. `src-tauri/src/evm/wallet_chain_config.rs` — add `local` to `NETWORK_KEYS`, `chain_id_for_key` (31337), and `default_rpc_urls_for_key` (`http://localhost:8545`).
9. `src-tauri/src/db.rs` — map `local` / `anvil` aliases to the `local` treasury chain key.

### Acceptance criteria

- [ ] `Local Anvil` appears in **Settings → EVM → Enabled chains** under a `Local` group.
- [ ] `Local Anvil` appears in the **Preferred network** selector.
- [ ] `Local Anvil` appears in the **RPC endpoints** selector with `http://localhost:8545` as the default.
- [ ] Balance reads and ETH transfers work against a node running on `http://localhost:8545`.
- [ ] `pnpm run check` does not introduce new diagnostics in the wallet module.
- [ ] `cargo check` in `src-tauri` passes.

### Out of scope

- Automatic Safe contract deployment on Anvil (Safe factory addresses are not configured for chain 31337).
- Alchemy/operator RPC integration for the local chain.
- Pre-deployed USDC/USDT mocks; the configuration uses zero-address placeholders intentionally so teams can supply their own mocks.

### Notes / open questions

- Should `local` be enabled by default for new accounts, or should it be opt-in to avoid confusing non-developer users?
- Should the zero-address placeholder tokens be hidden from the Send asset dropdown until real addresses are configured?
- Consider adding a small in-app hint that `local` requires a running Anvil node.
