# Manual smoke — squad sponsor (Sepolia)

Operator checklist for verifying sponsor deploy, balance read, and SQLite persistence on **desktop (Tauri)**. Product flows live in the app: **Deploy** launchpad → squad sponsor, then **Treasury** tab for balance and deposit.

Run with a logged-in profile that has **Sepolia ETH** for gas.

## Prerequisites

- [ ] Copy [`.env.example`](../../.env.example) → `.env` (or export in shell before `tauri dev`).
- [ ] Set **`PACTO_WALLET_RPC_SEPOLIA`** (and optionally unsuffixed `PACTO_*` wallet RPC vars).
- [ ] Set sponsor deploy bundle (Sepolia example in `.env.example`):
  - `PACTO_SQUAD_SPONSOR_FACTORY`
  - `PACTO_SPONSOR_PAYMASTER`
  - `PACTO_ENTRY_POINT`
- [ ] App profile has embedded EVM key with Sepolia ETH (see [MANUAL_E2E_CHECKLIST.md](./MANUAL_E2E_CHECKLIST.md) prerequisites).
- [ ] Pick a **test squad or network `parentId`** (use a throwaway squad — deploy is **one clone per parent id** on-chain).

## In-app path (preferred)

1. Open squad/network **#dashboard**.
2. **Deploy** (bottom bar) → **Deploy squad sponsor** (Sepolia).
3. **Treasury** tab — confirm sponsor row shows pool balance; optional **Deposit**.
4. Reload app — sponsor row still present (`list_squad_infra` / store hydrate).

## Step-by-step (devtools / debug)

1. **Deploy**

   ```javascript
   import { deploySquadSponsorForParent } from '/src/lib/governance/api.ts';
   const deploy = await deploySquadSponsorForParent({
     network: 'sepolia',
     parentId: 'YOUR_PARENT_ID',
   });
   console.log(deploy.txHash, deploy.sponsorAddress, deploy.infraRowId);
   ```

2. **Read summary**

   ```javascript
   import { getSquadSponsorSummary } from '/src/lib/governance/api.ts';
   const summary = await getSquadSponsorSummary({
     network: 'sepolia',
     parentId: 'YOUR_PARENT_ID',
     sponsorAddress: deploy.sponsorAddress,
   });
   console.log(summary.poolBalanceWei, summary.totalShares);
   ```

3. **Confirm persistence**

   ```javascript
   import { listSquadInfra } from '/src/lib/governance/api.ts';
   const rows = await listSquadInfra('YOUR_PARENT_ID');
   console.log(rows.filter((r) => r.infraType === 'sponsor'));
   ```

4. **Deposit (optional)**

   ```javascript
   import { depositSquadSponsor } from '/src/lib/governance/api.ts';
   await depositSquadSponsor({
     network: 'sepolia',
     parentId: 'YOUR_PARENT_ID',
     amountWei: '1000000000000000', // 0.001 ETH
   });
   ```

5. **Explorer** — open Sepolia explorer for `deploy.txHash`; confirm success and factory registry update.

## Failure notes

| Symptom | Likely cause |
|---------|----------------|
| `SPONSOR_CONFIG` / missing env | `PACTO_SQUAD_SPONSOR_FACTORY` (or `_SEPOLIA`) not set |
| `RPC_CONFIG` | `PACTO_WALLET_RPC_SEPOLIA` unset and defaults blocked |
| `SS_SquadAlreadyExists` (revert) | Same `parentId` already has a sponsor clone — use a new test parent |
| `SPONSOR_LOOKUP` on summary | Deploy tx failed or wrong network |
| `SPONSOR_REQUIRED` on Pacto Gov / Safe deploy | Deploy sponsor first (launchpad) |

## See also

- [PACTO_SQUAD_SPONSOR.md](./PACTO_SQUAD_SPONSOR.md) — upstream + app wiring
- [PACTO_GOV.md](./PACTO_GOV.md) — Nave Pirata (deploy **after** sponsor in product order)
- [NAVE_PIRATA_SMOKE.md](./NAVE_PIRATA_SMOKE.md) — Sepolia factory deploy checklist (A2)
- [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md) — reload / peer sync (A4)
- [INHOUSE_GOV.md](../../ai-docs/INHOUSE_GOV.md) — execution plan
