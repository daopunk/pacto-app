# Wallet (embedded EVM) — developer docs

Parent index: **[`docs/README.md`](../README.md)** (Nostr, MLS, storage layout, build).

These files are **tracked in git** and are intended for references from **source comments** and **user-facing strings** (e.g. error hints). Paths are stable on GitHub.

| Document | Summary |
|----------|---------|
| [DM_WALLET_MESSAGE_SCHEMA.md](./DM_WALLET_MESSAGE_SCHEMA.md) | JSON schema for DM `wallet_tx_request` / `wallet_tx_announcement`. |
| [RPC_AND_VIEM_ARCHITECTURE.md](./RPC_AND_VIEM_ARCHITECTURE.md) | RPC env vars; viem read-only vs Rust send. |
| [USD_PRICING.md](./USD_PRICING.md) | Chainlink feeds; backend pricing / env. |
| [TRANSACTION_LIFECYCLE.md](./TRANSACTION_LIFECYCLE.md) | Post transfer announcements only after successful receipt. |
| [CHAIN_CONFIG.md](./CHAIN_CONFIG.md) | Single source: `wallet-assets.json` + Rust `wallet_chain_config`; RPC env vars. |
| [MANUAL_E2E_CHECKLIST.md](./MANUAL_E2E_CHECKLIST.md) | Manual QA: Sepolia send/request/announcement/explorer verification. |
| [HD_DERIVATION_V1.md](./HD_DERIVATION_V1.md) | BIP-44 EVM path `m/44'/60'/0'/0/i`; mnemonic scope; golden vector. |
| [EVM_ADDRESS_DERIVATION.md](./EVM_ADDRESS_DERIVATION.md) | HD v1 + legacy SHA256-of-nostr note; canonical pubkey hash; legacy 0x04 repair. |
| [ONCHAIN_READ_PATTERN.md](./ONCHAIN_READ_PATTERN.md) | Shared pattern: persist / hydrate / background refresh / stale-while-revalidate for WalletBar + Safe-style hub reads. |
| [PACTO_GOV.md](./PACTO_GOV.md) | Upstream [covenant-gov/pacto-gov](https://github.com/covenant-gov/pacto-gov); in-app Alloy bindings and env-based deploy addresses. |
| [NAVE_PIRATA_SMOKE.md](./NAVE_PIRATA_SMOKE.md) | Manual Sepolia checklist: Pacto Gov / Nave Pirata factory deploy (A2). |
| [STANDALONE_SAFE_SMOKE.md](./STANDALONE_SAFE_SMOKE.md) | Manual Sepolia checklist: vault Safe deploy/import (A3). |
| [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md) | Manual checklist: `governance_updated` → `squad_infra` reload / peer sync (A4). |
| [ADVANCED_CONTRACT_SMOKE.md](./ADVANCED_CONTRACT_SMOKE.md) | Manual Sepolia checklist: viem reads + Advanced panel send / air-gap matrix (H10). |
| [SQUAD_ALLOWLIST_SMOKE.md](./SQUAD_ALLOWLIST_SMOKE.md) | Manual Sepolia checklist: allowlist admin + squad-key sends (I12). |
| [SQUAD_INBOX_ROSTER_SMOKE.md](./SQUAD_INBOX_ROSTER_SMOKE.md) | Manual checklist: Inbox rename + per-squad roster key on join (step 17 / G′). |
| [PACTO_SQUAD_SPONSOR.md](./PACTO_SQUAD_SPONSOR.md) | Upstream [covenant-gov/pacto-squad-sponsor](https://github.com/covenant-gov/pacto-squad-sponsor); deploy, summary read, `squad_infra` persistence. |
| [SQUAD_SPONSOR_SMOKE.md](./SQUAD_SPONSOR_SMOKE.md) | Manual Sepolia checklist: deploy sponsor, read balance, deposit (app + devtools). |

**Maintainers — alpha-only migrations (remove before beta / public v1):** WalletBar token-dropdown → watched-token list — [`docs/legacy-fixes/LF-002-wallet-bar-token-filter-migration.md`](../legacy-fixes/LF-002-wallet-bar-token-filter-migration.md). EVM address repair — [`docs/legacy-fixes/LF-001-evm-address-repair.md`](../legacy-fixes/LF-001-evm-address-repair.md). Full catalog: [`docs/legacy-fixes/CATALOG.md`](../legacy-fixes/CATALOG.md).

Supplementary / planning notes also live under **`ai-docs/wallet/`** (e.g. TECH SPEC, peer EVM observability); **`docs/wallet/`** here stays the canonical index for implementation-linked behavior.

**Dev:** With `vite` dev mode, the wallet sidebar shows **Post test announcement (dev)** — sends a valid `wallet_tx_announcement` JSON with a fake hash so `WalletTxAnnouncementCard` can be checked in-thread before real sends.

**Desktop (Tauri):** `get_wallet_summary` and `wallet_build_and_send_transaction` are registered commands; TypeScript helpers live in `src/lib/wallet/backend-wallet.ts`. **DM WalletBar Send** resolves the peer **`0x`** as **`dm_peer_evm`** first, then **`profiles.evm_address`** (see `docs/legacy-fixes/LF-003-peer-evm-send-fallback.md`). **Pairwise** **`wallet_peer_info_*`** DMs populate **`dm_peer_evm`**. **Settings → Wallet Send** passes **`to_address_evm`** so the backend uses a raw **`0x`** recipient instead. After a **confirmed** receipt from a **DM** send, the client posts a **`wallet_tx_announcement`** DM (`formatWalletTxAnnouncement` in `dm-messages.ts`). **Request** in the wallet bar posts **`wallet_tx_request`** JSON via `formatWalletTxRequest`. Those DM payloads **require** **`from_evm_address`** (active signer). **Kind 0** profile metadata may carry a **default-shared** payout `evm_address` for visibility; it can differ from the **active** signing address in **settings**.

Accepting a request opens the send form pre-filled and may attach **`request_id`** on the announcement when present.

**Balance cache:** The last successful **`get_wallet_summary`** response is stored per account as **`pacto_wallet_summary_cache_v1_<npub>`** (includes a fingerprint of the watched-token list). It is read into memory in **`loadAccountState`** and shown immediately when the WalletBar refreshes if the list still matches; see **`src/lib/wallet/wallet-summary-cache.ts`**. Cleared with other npub-scoped keys on logout (`clearAccountState`).

### Squad vs Advanced keys

- **Squad accounts** (`purpose: squad`): DM WalletBar Send, squad roster shares, treasury deploy, and governance commands. Only squad-purpose keys may be the active signer or profile receiving address.
- **Advanced accounts** (`purpose: advanced`): imported keys or derived advanced-only addresses. Used only from **Settings → Wallet → Advanced contract call** (`WalletAdvancedPanel.svelte`). Backend command **`evm_send_advanced_contract_call`** refuses squad signers; squad paths refuse advanced addresses (Phase G).
- **Generic reads** (token/module observation): viem via **`src/lib/evm/read-plane.ts`** — no private key. Does not replace curated pacto-gov dashboard reads in Rust.
- **Squad allowlisted calls:** Dashboard → Settings → **Smart contract security** — squad keys may call explicit allowlist targets + implicit deploy infra only (`evm_send_squad_allowlisted_contract_call`).
- Operator smoke: [ADVANCED_CONTRACT_SMOKE.md](./ADVANCED_CONTRACT_SMOKE.md), [SQUAD_ALLOWLIST_SMOKE.md](./SQUAD_ALLOWLIST_SMOKE.md).
