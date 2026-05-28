# Commons — public discovery

**Commons** is the leftmost top-nav mode (**Commons | DMs | Squads**). It shows **time-bounded public broadcasts** from users and from **public squads** (including squad-pairs), filterable by up to three hashtags.

Broadcasts are **public Nostr events** on trusted relays — not MLS, not Gift Wrap. Anyone on those relays can read tag text and messages. Squad identity on cards uses the stable **announcements MLS group id** ([`DESIGN.md`](./DESIGN.md)).

Internal backlog and phase history: [`ai-docs/commons/COMMONS_PLAN.md`](../../ai-docs/commons/COMMONS_PLAN.md).

---

## Product rules

| Rule | Behavior |
|------|----------|
| **Private squad** | Default at create. No Commons metadata, no broadcast menu, not in feed. |
| **Public squad** | Elect **1–3 tags** at create. Auto **24 h** broadcast on success. **Broadcast Squad** in squad header menu (24 / 48 / 72 h). |
| **Private user** | Default profile setting. No personal broadcast UI. |
| **Public user** | Profile → Commons: **New user** or **Active user** category, same TTL options. |
| **Cooldown** | One active broadcast per **(author npub, subject)** — user npub or squad id. UI blocks re-publish until `expiresAt`. |
| **Feed** | Active broadcasts only; relay lookback **≤ 72 h** (max TTL). Refreshes every **60 s** while Commons is open. |
| **Squad broadcast roles** | Stub allows all members today; `canBroadcastSquad` in `src/lib/commons/permissions.ts` will gate on Squad Admin when on-chain roles ship ([`ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md#commons-squad-broadcast-role-gate)). |

---

## User flows

### Discover

1. Open **Commons**.
2. Optionally enter **1–3 tags**, **Match: any / all**, **Show: users / squads / both**, and **Audience** (user cards only).
3. Cards show name, tags, message, time until expiry.
4. **Message** (user) → opens DM with that npub.
5. **Request to join** (squad) → structured DM (`commons_join_request`); squad side uses existing invite/join handling.

### Publish — squad

- **Create public squad** → automatic 24 h broadcast (tags from create form).
- **Squad header menu → Broadcast Squad** (public squads only) → duration + message modal.
- Cooldown copy when a broadcast is still active.

### Publish — user

- **Profile → Settings → Commons** → set visibility **Public**.
- **Commons tab → +** or profile panel → personal broadcast modal (category, tags, duration, message).

---

## Wire format

Public **Kind 30078** ([NIP-33](https://github.com/nostr-protocol/nips/blob/master/33.md) parameterized replaceable events). Same kind as other app-specific public events (e.g. dashboard polls), but Commons uses its own `d` tag and schema.

| Field | Value |
|-------|--------|
| **kind** | `30078` |
| **content** | JSON — schema `pacto.commons.broadcast.v1` |
| **`d`** | `pacto_commons_broadcast` (v1; see NIP-33 note below) |
| **`client`** | `pacto` |
| **`subject`** | `user` \| `squad` |
| **`exp`** | Expiry unix seconds (string) |
| **`t`** | Each tag (lowercase, max 3) |
| **`squad`** | Announcements MLS group id when `subject=squad` |

### JSON payload (examples)

**Squad broadcast:**

```json
{
  "schema": "pacto.commons.broadcast.v1",
  "subject": "squad",
  "message": "Open cohort for on-chain gov experiments.",
  "durationHours": 24,
  "expiresAt": 1740000000,
  "tags": ["neo", "coordination"],
  "squad": {
    "id": "<announcements_mls_group_id>",
    "name": "Neo Builders",
    "kind": "squad",
    "iconUrl": "https://…"
  }
}
```

**User broadcast:**

```json
{
  "schema": "pacto.commons.broadcast.v1",
  "subject": "user",
  "message": "Building wallet tooling; happy to DM.",
  "durationHours": 48,
  "expiresAt": 1740086400,
  "tags": ["neo"],
  "audience": "active_user"
}
```

`audience` is `new_user` \| `active_user` for user subjects only.

### Validation (publisher + consumer)

| Rule | Detail |
|------|--------|
| Tags | 1–3; `^[a-z0-9_]{1,32}$` after lowercasing and stripping `#` |
| TTL | `durationHours ∈ {24, 48, 72}` |
| Expiry | `expiresAt ≈ created_at + durationHours × 3600` (±60 s) |
| Squad id | Must match `squad` tag and payload; stable announcements group id |
| Expired | Dropped from feed and pruned from local cache |

### Join request DM (not Commons feed)

Kind **14** text with JSON `schema: pacto.commons.join_request.v1` — see `src/lib/commons/commons-join-request.ts`. Rate-limited client-side (24 h per squad target).

---

## NIP-33 enforcement (v1 vs future)

Kind **30078** is already a NIP-33 replaceable kind. **v1 does not use per-subject `d` tags**, so relays keep **every** published event until it ages out; the app enforces “one active card” by:

1. **Local cooldown** — `pacto_commons_broadcasts_<npub>` + SQLite active row per subject.
2. **Ingest dedupe** — newest non-expired event per `(authorNpub, subjectId)` in Rust and `dedupeCommonsBroadcasts` in the feed.

**To enforce NIP-33 at relay level** (post-v1, CM-10): use a **unique `d` per broadcast slot**, e.g. `pacto_commons_broadcast/user` for the author’s user slot and `pacto_commons_broadcast/squad/<groupId>` for each squad they broadcast. A newer publish with the same `(pubkey, kind, d)` replaces the old event on well-behaved relays.

| Work item | Effort |
|-----------|--------|
| Derive `d` from subject + subject id in `commons_publish_broadcast` | Small |
| Validate `d` on ingest | Small |
| Widen REQ filter (`kind` + `#client` instead of single `#d`) | Small |
| Tests + doc update | Small |
| **Breaking change** — flat `d` events stop matching until 72 h TTL clears | Acceptable pre-alpha |

**Overall: low–medium** (~half day). Deferred until dogfood shows duplicate-card noise; current dedupe + cooldown is enough for v1.

Optional later: slow-changing **`d: pacto_commons_squad`** profile event for tag discovery between broadcasts (also CM-10).

---

## Local persistence

| Key / table | Purpose |
|-------------|---------|
| `pacto_squads_<npub>` | `visibility`, `commonsTags` on each squad |
| `pacto_commons_profile_<npub>` | User Commons visibility |
| `pacto_commons_broadcasts_<npub>` | Own active broadcasts (cooldown UX) |
| `pacto_commons_join_requests_<npub>` | Join-request rate limit |
| SQLite `commons_broadcasts` | Ingested feed cache (per account DB) |

Cleared on logout via `clearAccountState`.

---

## Implementation map

| Layer | Location |
|-------|----------|
| Wire + publish/fetch | `src-tauri/src/commons.rs` |
| Tauri commands | `commons_publish_broadcast`, `commons_fetch_broadcasts`, `commons_get_local_active` |
| Frontend API | `src/lib/api/commons.ts` |
| Types | `src/lib/commons/types.ts` |
| Feed filter/sort/dedupe | `src/lib/commons/commons-feed.ts` |
| Tag normalization | `src/lib/commons/tags.ts` |
| Squad auto-broadcast on create | `src/lib/commons/squad-create-broadcast.ts` |
| Squad re-broadcast | `src/lib/commons/squad-broadcast.ts`, `BroadcastSquadModal.svelte` |
| User broadcast | `src/lib/commons/user-broadcast.ts`, `PersonalBroadcastModal.svelte` |
| Feed UI | `CommonsView.svelte`, `CommonsFilterSidebar.svelte`, `CommonsBroadcastCard.svelte` |
| Card actions | `src/lib/commons/commons-card-actions.ts` |
| Join request | `src/lib/commons/commons-join-request.ts`, `CommonsJoinRequestCard.svelte` |
| Role gate (stub) | `src/lib/commons/permissions.ts` |
| Squad create visibility UI | `SquadCommonsVisibilityFields.svelte` |
| Profile settings | `CommonsSettingsSection.svelte`, `UserCommonsBroadcastPanel.svelte` |
| User prefs store | `src/stores/commons-prefs.ts` |

Relays: **`TRUSTED_RELAYS`** only (same curated set as other app-specific public events). No Commons traffic on MLS or DM sync paths.

---

## Privacy and abuse (v1)

- **Public by design** — tags and broadcast text are visible on relays; modals should set expectations.
- **Impersonation** — squad name/id in JSON is a **claim**; join flow uses existing invite/crypto, not card text alone.
- **Spam** — trusted relays only; mute/report not in v1.
- **Tag charset** — ASCII lowercase + digits + underscore only.

---

## Related docs

| Doc | Relevance |
|-----|-----------|
| [`DESIGN.md`](./DESIGN.md) | Squad id = announcements MLS group id |
| [`../nostr/ARCHITECTURE.md`](../nostr/ARCHITECTURE.md) | Nostr paths vs MLS/DM |
| [`../dashboard/POLLS.md`](../dashboard/POLLS.md) | Kind 30078 JSON schema pattern |
| [`../../ai-docs/INHOUSE_GOV.md`](../../ai-docs/INHOUSE_GOV.md) | Future Squad Admin broadcast gate |
