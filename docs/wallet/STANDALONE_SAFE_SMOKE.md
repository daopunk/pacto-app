# Manual smoke — standalone Safe deploy (Sepolia)

Operator checklist for **A3** in [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md): `safe_deploy_proxy` via **Deploy Safe** UI, optional `PACTO_SAFE_*` env override (1.4 bundle), and vault persistence.

**Squad sponsor required first** (same gating as Pacto Gov). Extra vault Safes are allowed **alongside** pacto-gov; only the governance treasury Safe is skipped for `standalone_safe` rows.

## Prerequisites

- [ ] Sponsor deployed for test `parentId` ([SQUAD_SPONSOR_SMOKE.md](./SQUAD_SPONSOR_SMOKE.md)).
- [ ] **`PACTO_WALLET_RPC_SEPOLIA`** set.
- [ ] Optional — match pacto-gov factory Safe bundle (Sepolia 1.4.x in `.env.example`):
  - `PACTO_SAFE_PROXY_FACTORY`
  - `PACTO_SAFE_SINGLETON`
  - `PACTO_SAFE_FALLBACK_HANDLER`
- [ ] Embedded wallet has Sepolia ETH; squad members with shared EVM addresses on `#announcements` if using multi-owner deploy UI.
- [ ] `#announcements` channel on parent for treasury + governance announces.

## In-app path — deploy new proxy

1. **#dashboard** → **Deploy** → **Deploy Safe** (or **Treasury** → **Deploy Safe**).
2. Pick **Sepolia**, owners/threshold, optional vault label.
3. Confirm on-chain deploy → app opens **Treasury** tab.
4. Vault card shows **`Vault: <label>`** (not `Governance: Treasury` unless this Safe is the pacto-gov treasury).
5. Reload — Safe still in treasury list; `standalone_safe` infra row present (unless address is pacto-gov treasury).

## In-app path — import existing Safe

1. **Deploy** → **Import Safe** (or Treasury → **Import Safe**).
2. Paste `0x` address + chain + optional label.
3. Confirm → Treasury tab; infra row upserted by treasury `entry_id`.

## Explorer verification (deploy path)

1. Open deploy tx on Sepolia explorer.
2. Confirm **`ProxyCreation`** (or equivalent) from configured proxy factory.
3. Compare proxy address to treasury entry and `standalone_safe` row `canonical_ref`.

## Step-by-step (devtools / debug)

1. **Deploy via Tauri**

   ```javascript
   import { safeDeployProxy } from '/src/lib/wallet/backend-wallet.ts';
   import { getEvmAddress } from '/src/lib/api/auth.ts';
   const me = await getEvmAddress();
   const out = await safeDeployProxy('sepolia', [me], 1, null, 'YOUR_PARENT_ID');
   console.log(out);
   ```

2. **Link treasury + infra** — normally done by `onConfirmImportSafe` in the app shell. After manual deploy, import with the returned `safeAddress` or call the same upsert path as the UI.

3. **Confirm infra row**

   ```javascript
   import { listSquadInfra } from '/src/lib/governance/api.ts';
   const rows = await listSquadInfra('YOUR_PARENT_ID');
   console.log(rows.filter((r) => r.infraType === 'standalone_safe'));
   ```

## With pacto-gov already deployed

- Deploy a **second** Safe as a vault — should get its own `standalone_safe` row.
- The **governance treasury** Safe (from Nave Pirata) must **not** get a duplicate `standalone_safe` row when linked via `pacto-gov-treasury-{parentId}`.

## Failure notes

| Symptom | Likely cause |
|---------|----------------|
| `SPONSOR_REQUIRED` | Deploy sponsor first |
| `SAFE_CONFIG` / factory errors | Missing `PACTO_SAFE_*` and no default for chain |
| Deploy UI: no roster addresses | Members have not published squad EVM shares on `#announcements` |
| No `standalone_safe` row after import | Safe address matches pacto-gov treasury (expected skip) |
| `TREASURY_SAFE_UI_CAP` | Too many linked Safes for UI cap — use fresh parent |

## See also

- [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md) — **A4** announce + reload
- [INHOUSE_GOV.md](../../ai-docs/INHOUSE_GOV.md) — vault labels (`Governance: Treasury` vs `Vault: <name>`)
