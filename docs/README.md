# Pacto — contributor documentation

These docs are **tracked in git** and are the primary map for humans and coding agents: architecture, storage, messaging, and operational behavior.

| Area | Purpose |
|------|---------|
| **[messaging/](./messaging/)** | DM vs MLS: kinds, events, Tauri commands, frontend hooks |
| **[nostr/](./nostr/)** | Relay-facing behavior, rumor pipeline, module index |
| **[mls/](./mls/)** | MDK engine, storage split, invites, eviction & leave |
| **[storage-layout/](./storage-layout/)** | SQLite schema, paths, logout, local message encryption |
| **[communities/](./communities/)** | **Squads & in-app Networks**: shared MLS model, stable ids, invites, persistence |
| **[legacy-fixes/](./legacy-fixes/)** | Alpha-only repair code to remove before public v1 |
| **[wallet/](./wallet/)** | Embedded EVM wallet, RPC, chain config, DM payment messages |
| **[build/](./build/)** | Desktop build guides (macOS, Windows, Ubuntu) |

## Conventions

- **Code wins:** If this tree disagrees with `src-tauri/src/` or `src/`, treat the code as source of truth and update the doc.
- **Product name:** User-facing copy says **Pacto**. Some Rust comments still say “Vector” for historical reasons.

## Migration from informal `ai-docs/`

If you used a local **`ai-docs/`** folder (gitignored), see **[`MIGRATION_FROM_AI_DOCS.md`](./MIGRATION_FROM_AI_DOCS.md)** for what was transcribed, what was skipped, and safe deletion steps. A short deprecation notice also lives in **`ai-docs/README.md`** until you remove that directory.
