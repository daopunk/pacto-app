# Squad contract allowlist — manual smoke (Phase I)

Operator checklist for **Dashboard → Settings → Smart contract security**. Requires Sepolia RPC and deployed **Pacto Gov** for allowlist edits (interim policy).

## Prerequisites

- [ ] Squad with **Pacto Gov** infra row (`permissionsCtx.phase === pacto_gov`).
- [ ] Active **squad-purpose** signer (Settings → Wallet).
- [ ] Optional: second client on same squad to verify allowlist announce sync.

## I12 matrix

### Allowlist admin

- [ ] Role-approved viewer (Pacto Gov deployed): **Add contract** — chain, `0x`, label, optional ABI ref.
- [ ] Row appears in list with added-by npub; peers receive **`squad_contract_allowlist_updated`** on **#inbox**.
- [ ] **Remove** deletes row locally and announces `action: remove`.

### Squad-key send (allowlisted)

- [ ] Member selects allowlisted target (or implicit infra `to` such as deployed Safe).
- [ ] **Simulate** succeeds; **Send (squad key)** mines on Sepolia.
- [ ] Non-allowlisted `0x` returns **`TARGET_NOT_ALLOWLISTED`**.

### Air-gap

- [ ] **Advanced** panel can still send to arbitrary `to` with advanced key.
- [ ] Advanced signer cannot call **`evm_send_squad_allowlisted_contract_call`** (squad signer required).
- [ ] Squad roster share still rejects advanced-purpose addresses (Phase G).

## See also

- [`ADVANCED_CONTRACT_SMOKE.md`](./ADVANCED_CONTRACT_SMOKE.md)
- [`ai-docs/EVM_INTEGRATION_LAYERS.md`](../../ai-docs/EVM_INTEGRATION_LAYERS.md)
