# Manual smoke — squad sponsor (Sepolia)

Sprint-1 exit check: **deploy sponsor → read pool balance → confirm `squad_infra` row**. Deposit + Treasury UI are step 6 ([INHOUSE_GOV.md](../../ai-docs/INHOUSE_GOV.md) steps 6–7).

Run on **desktop (Tauri)** with a logged-in profile that has **Sepolia ETH** for gas.

## Prerequisites

- [ ] Copy [`.env.example`](../../.env.example) → `.env` (or export in shell before `tauri dev`).
- [ ] Set **`PACTO_WALLET_RPC_SEPOLIA`** (and optionally unsuffixed `PACTO_*` wallet RPC vars).
- [ ] Set sponsor deploy bundle (Sepolia example in `.env.example`):
  - `PACTO_SQUAD_SPONSOR_FACTORY`
  - `PACTO_SPONSOR_PAYMASTER`
  - `PACTO_ENTRY_POINT`
- [ ] App profile has embedded EVM key with Sepolia ETH (see [MANUAL_E2E_CHECKLIST.md](./MANUAL_E2E_CHECKLIST.md) prerequisites).
- [ ] Pick a **test squad or network `parentId`** (use a throwaway squad — deploy is **one clone per parent id** on-chain).

## A. One-shot smoke (recommended)

From the Tauri webview devtools console (Vite dev) after opening any squad dashboard:

```javascript
import { runSquadSponsorSepoliaSmoke } from '/src/lib/governance/squad-sponsor-smoke.ts';

const parentId = 'YOUR_SQUAD_OR_NETWORK_ID';
const result = await runSquadSponsorSepoliaSmoke({ parentId });
console.log(result);
// expect result.passed === true
```

Optional initial pool funding on deploy (payable factory):

```javascript
await runSquadSponsorSepoliaSmoke({
  parentId,
  initialDepositWei: '1000000000000000', // 0.001 ETH
});
```

**Pass criteria (`result.checks`):**

| Check | Meaning |
|-------|---------|
| `infraRowPresent` | `list_squad_infra` returned a `sponsor` row |
| `infraRowIdMatches` | Row id matches `deploy.infraRowId` |
| `canonicalRefMatchesDeploy` | Row `canonicalRef` is the sponsor clone address |
| `summarySponsorMatchesDeploy` | `get_squad_sponsor_summary` agrees on clone address |
| `poolBalanceReadable` | `poolBalanceWei` is a decimal wei string |

**Pass:** `result.passed === true`.

## B. Step-by-step (debug)

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

4. **Explorer** — open Sepolia explorer for `deploy.txHash`; confirm success and factory `SquadCreated` / registry update.

5. **Reload app** — `list_squad_infra` row still present (SQLite).

## C. Failure notes

| Symptom | Likely cause |
|---------|----------------|
| `SPONSOR_CONFIG` / missing env | `PACTO_SQUAD_SPONSOR_FACTORY` (or `_SEPOLIA`) not set |
| `RPC_CONFIG` | `PACTO_WALLET_RPC_SEPOLIA` unset and defaults blocked |
| `SS_SquadAlreadyExists` (revert) | Same `parentId` already has a sponsor clone — use a new test parent |
| `SPONSOR_LOOKUP` on summary | Deploy tx failed or wrong network |
| `passed` false on `infraRowPresent` | Deploy succeeded but persist failed — check Tauri logs for `PERSIST_SPONSOR` |

## D. Not in this smoke (step 6)

- [ ] `deposit_squad_sponsor` command
- [ ] Treasury tab sponsor row
- [ ] Launchpad gating
- [ ] `#announcements` `governance_updated` with `provider: sponsor` (helper: `buildSponsorGovernanceAnnouncePayload` in `src/lib/governance/api.ts`)

---

## See also

- [PACTO_SQUAD_SPONSOR.md](./PACTO_SQUAD_SPONSOR.md) — upstream + app wiring
- [PACTO_GOV.md](./PACTO_GOV.md) — Nave Pirata (deploy **after** sponsor in product order)
