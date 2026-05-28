# Commons discovery

Public squad and user broadcasts over Nostr Kind **30078** (`d: pacto_commons_broadcast`). Normative wire format and backlog: [`ai-docs/commons/COMMONS_PLAN.md`](../../ai-docs/commons/COMMONS_PLAN.md).

## Implementation map

| Layer | Location |
|-------|----------|
| Wire + publish/fetch | `src-tauri/src/commons.rs` |
| Tauri commands | `commons_publish_broadcast`, `commons_fetch_broadcasts`, `commons_get_local_active` |
| SQLite cache | `commons_broadcasts` table (per-account DB) |
| Frontend API | `src/lib/api/commons.ts` |
| Feed UI | `src/components/commons/CommonsView.svelte` |

Relay lookback is capped at **72 hours** (max broadcast TTL). Trusted relays only — same set as other app-specific public events.
