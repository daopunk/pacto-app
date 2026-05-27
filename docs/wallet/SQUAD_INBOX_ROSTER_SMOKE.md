# Squad Inbox & per-squad roster keys — manual smoke (step 17 / Phase G′)

Operator checklist for **Inbox rename** and **join roster key choice**. Requires desktop (Tauri), unlocked wallet, and a test squad with `#announcements` MLS group.

## Prerequisites

- [ ] Phase **G** ✅ (squad vs advanced accounts).
- [ ] Two test accounts (inviter + joiner) or single-account dev loop.
- [ ] Joiner has at least one **squad-purpose** derived account (Settings → Wallet).

## G′1 — Inbox channel rename

- [ ] Default automation sidebar shows **`#inbox`** (not `#monitor`).
- [ ] Governance / treasury / roster share automation still appears in Inbox timeline.
- [ ] Wire bucket matches ADR decision (full **`inbox`** rename vs display-only alias).

## G′2–G′6 — Join key choice

### Default squad signer

- [ ] Joiner accepts squad invite; **Inbox card** offers default vs new key (not DM invite Share / Not now).
- [ ] Joiner picks **Use default squad signer** → `squad_member_evm` row matches active squad signer; global active signer unchanged.
- [ ] Roster visible to other members via `squad_member_evm_share` in Inbox.

### New key for this squad

- [ ] Joiner picks **Generate new key for this squad** → new derived squad account created (or bound).
- [ ] Roster row uses **new address**; global **active squad signer** (DM Send) **unchanged**.
- [ ] Settings → Wallet still shows previous account as active signer.

### Defer

- [ ] **Defer** leaves no roster row until user completes Inbox card later.

### Creator / auto-share

- [ ] Squad create does **not** silently auto-share joiner's key without Inbox choice (G′6).

## G′5 — Change Signer modal

- [ ] Existing member can switch binding via same default vs new-key choices.

## G′8 — Deploy uses roster-bound address

- [ ] Member with per-squad key: curated deploy (e.g. Safe) uses **that squad's roster address**, not global active signer when they differ.

## Air-gap (regression)

- [ ] Advanced-purpose address still rejected on roster share ingest.
- [ ] Advanced panel still unrelated to squad roster.

## See also

- [`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md) — step **17**, checklist G′1–G′11
- [`GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md`](./GOVERNANCE_ANNOUNCE_SYNC_SMOKE.md)
