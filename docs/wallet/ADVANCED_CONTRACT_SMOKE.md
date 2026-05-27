# Advanced contract calls — manual smoke (Phase H)

Operator checklist for **Settings → Profile → Wallet → Advanced contract call**. Requires Sepolia RPC (`VITE_WALLET_RPC_SEPOLIA` or defaults).

## Prerequisites

- [ ] Desktop app (Tauri) with unlocked wallet.
- [ ] At least one **advanced-purpose** account (import private key or **Add advanced account**).
- [ ] Active **advanced signer** selected (radio in Advanced accounts list).
- [ ] Squad signer remains a **squad-purpose** derived account (for negative tests).

## H10 matrix

### Generic read (viem)

- [ ] DevTools or a one-off script: `readContract` from `src/lib/evm/read-plane.ts` with shipped `erc20-minimal` ABI against a known Sepolia token — returns without using a private key.

### Advanced send — happy path

- [ ] Open Advanced panel; banner shows **not linked to any squad**.
- [ ] Enter a benign `to` (e.g. your own advanced address), `0` ETH, raw calldata `0x`.
- [ ] **Simulate (eth_call)** succeeds.
- [ ] **Review & send** → confirm shows full calldata → tx mines; explorer link opens.

### Advanced send — squad signer rejected

- [ ] Set **squad** account as active signer only (no advanced radio change needed for WalletBar).
- [ ] Attempt Advanced send — backend returns **`ADVANCED_SIGNER_REQUIRED`** (or UI blocks before send if no advanced signer).

### Squad share — advanced address rejected

- [ ] Try to publish an advanced-purpose address via squad roster path (Change Signer / share) — backend or UI refuses (Phase G guard).

### Simulation revert

- [ ] Point `to` at a contract with reverting calldata; **Simulate** shows revert message; do not broadcast unless intentional.

### Squad infra soft deny (optional)

- [ ] If local `squad_infra` rows exist, enter matching `canonical_ref` as `to` — UI warns and requires acknowledge checkbox before send.

## See also

- [`RPC_AND_VIEM_ARCHITECTURE.md`](./RPC_AND_VIEM_ARCHITECTURE.md) — read vs send ownership.
- [`ai-docs/EVM_INTEGRATION_LAYERS.md`](../../ai-docs/EVM_INTEGRATION_LAYERS.md) — air-gap rules.
