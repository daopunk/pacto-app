# Manual smoke — Nave Pirata / Pacto Gov (Sepolia)

Operator checklist for **A2** in [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md): full factory deploy via `deploy_nave_pirata_for_parent`, explorer confirmation, and local persistence.

Run on **desktop (Tauri)** with a profile that has **Sepolia ETH** for gas. **Squad sponsor must exist first** (launchpad gating + `SPONSOR_REQUIRED` on the Rust command).

## Prerequisites

- [ ] Complete [SQUAD_SPONSOR_SMOKE.md](./SQUAD_SPONSOR_SMOKE.md) for the same test `parentId` (or deploy sponsor in-app first).
- [ ] Copy [`.env.example`](../../.env.example) → `.env` (or export before `tauri dev`).
- [ ] Set **`PACTO_WALLET_RPC_SEPOLIA`**.
- [ ] Set pacto-gov deploy bundle (Sepolia example in `.env.example`):
  - `PACTO_NAVE_PIRATA_FACTORY`
  - `PACTO_NAV_MASTER_QUARTERMASTER`
  - `PACTO_NAV_MASTER_MUTINY`
  - `PACTO_NAV_MASTER_TREASURY_AUTHORITY`
  - `PACTO_NAV_MASTER_SQUAD_ADMIN`
  - Optional reads: `PACTO_NAVE_PIRATA_REGISTRY`, `PACTO_HATS`
- [ ] Test squad/network has **`#announcements`** and **`#inbox`** for persist + announce.
- [ ] Use a **throwaway parent id** — each successful deploy mints a new on-chain hat tree.

## In-app path (preferred)

1. Open **#dashboard** for the test parent.
2. **Deploy** (bottom bar) → **Set up Pacto Gov** (Sepolia).
3. Wizard: captain = embedded wallet `0x…`, metadata URI (any non-empty string), optional salt nonce.
4. Wait for confirmation → app switches to **Governance** tab.
5. **Treasury** — row labeled **`Governance: Treasury`** for the factory Safe.
6. **Roles Tree** — Hats tree loads from `topHatId` in infra row.
7. Reload app — `pacto_gov` infra row and treasury Safe still present.

## Explorer verification

1. Copy deploy **tx hash** from toast or devtools.
2. Open Sepolia explorer → confirm **`NavePirataDeployed`** log from `PACTO_NAVE_PIRATA_FACTORY`.
3. Note **`_topHatId`**, **`_safe`**, **`_squadAdminProxy`** in the event — they should match `provider_payload` on the infra row.

## Step-by-step (devtools / debug)

1. **Deploy**

   ```javascript
   import { deployNavePirataForParent } from '/src/lib/governance/api.ts';
   import { getEvmAddress } from '/src/lib/api/auth.ts';
   const captain = await getEvmAddress();
   const out = await deployNavePirataForParent({
     network: 'sepolia',
     parentId: 'YOUR_PARENT_ID',
     captain,
     metadataUri: 'ipfs://smoke-test',
   });
   console.log(out.txHash, out.topHatId, out.safeAddress, out.squadAdminProxy);
   ```

2. **Persist + announce** (if not using wizard `onPactoGovDeployComplete`)

   Call `finalizePactoGovDeploy` from the app shell or manually `upsertSquadInfra` + post `governance_updated` — see [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md).

3. **Confirm SQLite row**

   ```javascript
   import { listSquadInfra, pactoGovInfraId } from '/src/lib/governance/api.ts';
   const rows = await listSquadInfra('YOUR_PARENT_ID');
   console.log(rows.find((r) => r.id === pactoGovInfraId('YOUR_PARENT_ID')));
   ```

4. **Read registry (optional)**

   ```javascript
   import { getNavePirataDeployment } from '/src/lib/governance/api.ts';
   const d = await getNavePirataDeployment({ network: 'sepolia', topHatId: out.topHatId });
   console.log(d);
   ```

## Failure notes

| Symptom | Likely cause |
|---------|----------------|
| `SPONSOR_REQUIRED` | Deploy squad sponsor for this parent first |
| `NAVE_PIRATA_CONFIG` / missing env | `PACTO_*` factory or master copy not set |
| `RPC_CONFIG` | `PACTO_WALLET_RPC_SEPOLIA` unset |
| `PARSE_RECEIPT` / no `NavePirataDeployed` log | Wrong factory address, failed tx, or RPC lag — check explorer |
| `INVALID_CAPTAIN` | Captain address not valid `0x` + 40 hex |
| Wizard blocked | No `#announcements` channel on parent |

## See also

- [PACTO_GOV.md](./PACTO_GOV.md) — upstream repo + bindings
- [SQUAD_SPONSOR_SMOKE.md](./SQUAD_SPONSOR_SMOKE.md) — required first deploy
- [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md) — **A4** reload / peer sync
- [INHOUSE_GOV.md](../../ai-docs/INHOUSE_GOV.md) — execution plan step **13**
