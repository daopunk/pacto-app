# Manual smoke — governance announce sync (A4)

Operator checklist for **A4** in [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md): after any governance deploy, verify **`governance_updated`** (and treasury **`squad_safe_updated`** where applicable) round-trip into **`squad_infra`** SQLite — on **reload** or a **second client**.

Applies to sponsor, pacto-gov, squad-admin, and standalone Safe flows.

## Wire shape (reference)

Announce body is JSON from `buildAnnounceContent` with `type: "governance_updated"` and payload fields:

| Field | Required | Notes |
|-------|----------|--------|
| `parent_id` | yes | Squad/network root id |
| `provider` | yes | `sponsor`, `pacto_gov`, `squad_admin`, or `gnosis_safe` (maps to `standalone_safe`) |
| `canonical_ref` | yes | Sponsor address, top hat id, squad-admin proxy, or Safe address |
| `entry_id` | yes | Stable infra row id — merge key for ingest |
| `chain` | recommended | `sepolia`, `mainnet`, `optimism` |
| `provider_payload` | recommended | JSON string from deploy result |

Rust ingest: `maybe_upsert_governance_from_announce` in `src-tauri/src/db.rs`.

## Single-client reload test

1. Note `listSquadInfra(parentId)` **before** deploy (devtools or fresh parent).
2. Run an in-app deploy (sponsor, Pacto Gov, Squad Admin, or vault Safe) — see linked smoke docs.
3. In **#inbox** (automation channel), locate the latest **`governance_updated`** message (and **`squad_safe_updated`** for Safe treasury links).
4. Confirm payload includes **`entry_id`** matching the infra row id (e.g. `sponsor-{parentId}`, `pacto-gov-{parentId}`, `squad-admin-{parentId}`, or treasury UUID for vaults).
5. **Quit and restart** the app (or switch account away and back).
6. Open **#dashboard** for the same parent.
7. **Pass:** Launchpad/Treasury/Settings reflect deployed state; `listSquadInfra` returns the same rows and `canonical_ref` values.

## Two-client sync test

1. **Client A** — deploy infra on a shared test squad (both members in MLS group + `#announcements`).
2. **Client B** — same account or a second member: open the squad, ensure MLS sync ran (`sync_mls_groups_now` if needed).
3. Open **#dashboard** on Client B without redeploying.
4. **Pass:** Client B shows the same infra (sponsor balance row, pacto-gov tabs, vault Safes, etc.) after announce ingest.

If Client B is a **different npub**, they must receive `#announcements` DMs via MLS — membership and welcome acceptance required.

## Devtools checks

```javascript
import { listSquadInfra } from '/src/lib/governance/api.ts';
const parentId = 'YOUR_PARENT_ID';
const rows = await listSquadInfra(parentId);
console.table(rows.map((r) => ({
  id: r.id,
  type: r.infraType,
  ref: r.canonicalRef,
  chain: r.chain,
})));
```

Re-run after reload; ids and refs must be stable (no duplicate rows for the same `entry_id`).

## Failure notes

| Symptom | Likely cause |
|---------|----------------|
| Row after deploy but gone after reload | Deploy path skipped `upsertSquadInfra` (devtools-only deploy without finalize) |
| Second client never hydrates | No `#announcements` channel, MLS not synced, or member not in group |
| Duplicate infra rows | Same deploy announced twice with **different** `entry_id` values |
| `unknown squad infra type` in logs | Legacy provider string not mapped in `normalize_infra_type` |

## Automated payload shape tests

Unit tests in `src/lib/governance/governance-announce-payload.test.ts` assert frontend announce builders include required ingest fields. They do **not** replace this manual Sepolia checklist.

## See also

- [SQUAD_SPONSOR_SMOKE.md](./SQUAD_SPONSOR_SMOKE.md)
- [NAVE_PIRATA_SMOKE.md](./NAVE_PIRATA_SMOKE.md)
- [STANDALONE_SAFE_SMOKE.md](./STANDALONE_SAFE_SMOKE.md)
- [INHOUSE_GOV.md](../../ai-docs/INHOUSE_GOV.md) — Phase **B3** (entry_id on all providers)
