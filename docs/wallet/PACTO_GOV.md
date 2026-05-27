# pacto-gov (external contract repo)

Governance contract sources for **Nave Pirata** live in the upstream repository only — **not** vendored in this app repo.

**Canonical source:** [github.com/covenant-gov/pacto-gov](https://github.com/covenant-gov/pacto-gov) (`dev` branch during active development).

## How Pacto uses it

| Concern | Where in Pacto |
|---------|----------------|
| Alloy bindings (deploy surface) | `src-tauri/src/evm/contracts/pacto_gov/mod.rs` — hand-maintained `sol!` aligned with upstream interfaces |
| Deployed factory / master copies | Runtime env (`PACTO_*` in [`.env.example`](../../.env.example)); see [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md) for Sepolia reference |
| Audit trail on deploy | Optional `pacto_gov_revision` on governance rows / announces — **upstream git commit SHA**, not a local submodule pin |

When upstream interfaces change, update bindings in `evm/contracts/pacto_gov/` against the reviewed commit on GitHub (Foundry `out/` JSON generation is optional follow-on).

## Manual smoke (Sepolia)

Operator checklist: [NAVE_PIRATA_SMOKE.md](./NAVE_PIRATA_SMOKE.md) (requires squad sponsor first). Announce sync: [GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md).

## Related

- Squad sponsor contracts: [github.com/covenant-gov/pacto-squad-sponsor](https://github.com/covenant-gov/pacto-squad-sponsor) (same pattern — external repo, env addresses, in-app bindings).
- Planning: [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md), [`ai-docs/gov-core/`](../../ai-docs/gov-core/).
