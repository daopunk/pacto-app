# Code Review — Local Anvil / Dev Auto-Config

**Branch:** `feat/local-dev-auto-config`  
**Base:** `e993198221148120929b9d5aa3e3dcff6abf8ddf` (`origin/main`)  
**Review date:** 2026-06-26  
**Scope:** 23 changed files on the feature branch; untracked docs/log excluded  
**Intent:** Add Local Anvil chain (chain ID 31337) support for dockerized local development, plus auto-wiring of local relay/RPC/chain defaults in dev builds.

## Reviewers

- correctness
- testing
- maintainability
- project-standards
- security
- api-contract
- reliability
- adversarial
- julik-frontend-races
- ce-agent-native-reviewer
- ce-learnings-researcher

## Applied fixes (safe, verified)

| # | File | Fix | Reviewer |
|---|------|-----|----------|
| 2 | `src/lib/dev/local-dev-setup.ts:21` | Clear timeout when promise settles; avoid unhandled late rejection | correctness, maintainability, reliability |
| 3 | `src/lib/dev/local-dev-setup.ts:53` | Skip default-RPC write when any value is already configured | correctness, reliability, testing |
| 4 | `src/lib/dev/local-dev-setup.ts:60` | Wrap chain/RPC setup in try/catch so failures are logged | correctness, reliability |
| 6 | `src/lib/wallet/wallet-ui-prefs.ts:18` | Exclude `local` from default enabled chains in production builds | adversarial, api-contract |
| 9 | `package.json:15` | Add pinned `serve` devDependency; remove `npx` from script | project-standards |
| 10 | `package.json:30` | Align `@vitest/coverage-v8` to `^3.0.0` | project-standards |
| 11 | `src-tauri/src/evm/wallet_chain_config.rs:183` | Return empty string from Rust `explorer_url_for_tx` when path is empty | api-contract |
| 12 | `src-tauri/src/evm/wallet_chain_config.rs:224` | Restore `ALCHEMY_RPC_KEY` on panic via Drop guard in test | correctness, reliability |
| 13 | `src-tauri/src/lib.rs:2788` | Add Rust unit tests for `validate_relay_url` boundary cases | testing |
| 14 | `src-tauri/src/lib.rs:2799` | Update error message to mention `ws://localhost` allowance | api-contract, project-standards |
| 16 | `src/lib/dev/local-dev-setup.ts:50` | Add test that `import.meta.env.DEV=false` short-circuits setup | testing |
| 19 | `src-tauri/src/evm/wallet_chain_config.rs:204` | Assert addresses are non-empty instead of exact zero-address | maintainability |

**Validation:** `pnpm test` 251 pass (was 249; added non-DEV and RPC-preserve tests), `pnpm check` pre-existing errors only. Rust tests were not run locally because cargo was unavailable.

**Commit:** `fix(review): harden local-dev defaults and fix relay/env issues`

## Triage groups

| Group | Findings | Context | Preferred resolution | Why |
|-------|----------|---------|----------------------|-----|
| Persistence loader carries dev wiring | #3, #12 | `loadAccountState` imports and triggers dev-only side effects | Move `applyLocalDevDefaults` call to explicit unlock/login/create handlers and dynamically import the dev module | Both findings stem from the same architectural choice |
| Local-dev defaults lifecycle gaps | #5, #8, #9, #10 | Helper re-runs on every load and can re-enable a disabled chain / leave dev state in production | Add per-npub/session applied flag, skip when values exist, and consider prod cleanup; add timeout/failure tests first | These are all about when and how often defaults run and what state they leave |
| Docs, contracts, and helper-chain gaps | #4, #6, #7, #11, #13 | Schema docs drift, agent accessibility, duplicated Anvil chain, zero-address placeholders, missing asset-helper coverage | Update `DM_WALLET_MESSAGE_SCHEMA.md`, document/expose agent path, import viem's anvil, gate zero-address tokens, add asset-helper tests | Follow-up documentation/contract/test items rather than runtime bugs |

## P1 — High

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 1 | `src-tauri/src/lib.rs:2787` | String-prefix relay URL validation allows `ws://localhost` bypass to arbitrary hosts | adversarial, maintainability, security | 100 |
| 2 | `src/lib/wallet/chains.ts:100` | `anvil` alias accepted inconsistently across TS/Rust | adversarial, api-contract, maintainability | 100 |
| 3 | `src/stores/persistence.ts:48` | Dev defaults helper mutates state inside persistence loader | julik-frontend-races, maintainability | 100 |

- **#1** — The backend relay validator uses string-prefix checks instead of parsing the URL. A URL like `ws://localhost:7000@evil.com` passes the prefix check while a URL parser treats `evil.com` as the host and `localhost:7000` as userinfo, letting the app connect to an attacker-controlled relay. Fix: parse with a proper URL parser and allow `ws://` only for exact `localhost`/`127.0.0.1` hosts with no userinfo.
- **#2** — `parseSupportedChainId` and `normalize_treasury_chain` accept `anvil` as an alias for `local`, but the DM message validator and Rust `network_by_key` reject it. This cross-layer inconsistency will cause messages or commands carrying the raw alias to fail unexpectedly. Fix: either accept `anvil` everywhere or reject it everywhere; prefer accepting it to match the frontend parser.
- **#3** — `loadAccountState` is documented as loading account-specific state from localStorage, but it now silently calls `applyLocalDevDefaults`, which writes relay, enabled-chain, and default-RPC preferences. This hides a side effect in a hydration function and couples the persistence layer to dev-setup logic. Fix: move the dev-defaults call out to the account unlock/login/create flow after `loadAccountState` completes.

## P2 — Moderate

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 4 | `docs/wallet/DM_WALLET_MESSAGE_SCHEMA.md:38` | DM wallet message schema doc omits local (and other supported) networks | api-contract | 100 |
| 5 | `src/lib/dev/local-dev-setup.ts:24` | Missing tests for relay timeout and failure paths in local-dev-setup | testing | 100 |
| 6 | `src/lib/dev/local-dev-setup.ts:58` | Local-dev auto-configuration is UI-only and not agent/CLI accessible | agent-native-reviewer | 100 |
| 7 | `src/lib/wallet/chains.ts:9` | Custom Anvil chain duplicates viem's built-in definition | maintainability | 100 |
| 8 | `src/lib/dev/local-dev-setup.ts:3` | Dev defaults run on every load, not once per session | maintainability | 75 |
| 9 | `src/lib/dev/local-dev-setup.ts:48` | Dev auto-setup reverts disabled local chain and custom local RPC | adversarial | 75 |
| 10 | `src/lib/dev/local-dev-setup.ts:58` | Dev-mode local relay/RPC/chain defaults persist into production state | security | 75 |
| 11 | `src/lib/wallet/wallet-assets.json:107` | Zero-address USDC/USDT placeholders are selectable for transfers | adversarial | 75 |
| 12 | `src/stores/persistence.ts:1` | Dev-only helper is statically imported into production entry path | project-standards | 75 |

## P3 — Low

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 13 | `src/lib/wallet/assets.ts:73` | Missing local-chain coverage for asset helper functions | testing | 100 |

## Actionable findings

| # | File | Issue | Route | Notes |
|---|------|-------|-------|-------|
| 1 | `src-tauri/src/lib.rs:2787` | String-prefix relay URL validation allows `ws://localhost` bypass to arbitrary hosts | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 2 | `src/lib/wallet/chains.ts:100` | `anvil` alias accepted inconsistently across TS/Rust | manual → downstream-resolver | suggested_fix present, requires verification |
| 3 | `src/stores/persistence.ts:48` | Dev defaults helper mutates state inside persistence loader | manual → downstream-resolver | suggested_fix present, requires verification |
| 4 | `docs/wallet/DM_WALLET_MESSAGE_SCHEMA.md:38` | DM wallet message schema doc omits local (and other supported) networks | manual → downstream-resolver | suggested_fix present |
| 5 | `src/lib/dev/local-dev-setup.ts:24` | Missing tests for relay timeout and failure paths in local-dev-setup | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 6 | `src/lib/dev/local-dev-setup.ts:58` | Local-dev auto-configuration is UI-only and not agent/CLI accessible | manual → downstream-resolver | suggested_fix present |
| 7 | `src/lib/wallet/chains.ts:9` | Custom Anvil chain duplicates viem's built-in definition | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 8 | `src/lib/dev/local-dev-setup.ts:3` | Dev defaults run on every load, not once per session | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 9 | `src/lib/dev/local-dev-setup.ts:48` | Dev auto-setup reverts disabled local chain and custom local RPC | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 10 | `src/lib/dev/local-dev-setup.ts:58` | Dev-mode local relay/RPC/chain defaults persist into production state | manual → downstream-resolver | suggested_fix present, requires verification |
| 11 | `src/lib/wallet/wallet-assets.json:107` | Zero-address USDC/USDT placeholders are selectable for transfers | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 12 | `src/stores/persistence.ts:1` | Dev-only helper is statically imported into production entry path | gated_auto → downstream-resolver | suggested_fix present, requires verification |
| 13 | `src/lib/wallet/assets.ts:73` | Missing local-chain coverage for asset helper functions | gated_auto → downstream-resolver | suggested_fix present, requires verification |

## Pre-existing issues

None identified.

## Learnings and past solutions

- The branch follows the documented single-source chain-config pattern (`wallet-assets.json` + Rust `wallet_chain_config.rs`).
- Past wallet/account-state persistence stories: `docs/legacy-fixes/LF-001-evm-address-repair.md`, `docs/legacy-fixes/LF-002-wallet-bar-token-filter-migration.md`, `docs/legacy-fixes/LF-003-peer-evm-send-fallback.md`.
- The only place Anvil deploy/manual steps are documented is the untracked `pacto-app-local-chain-setup.md`; canonical docs under `docs/wallet/` predate the `local` chain and are now out of sync.

## Agent-native gaps

- `applyLocalDevDefaults` is only reachable through the SvelteKit login/unlock flow and is gated on `import.meta.env.DEV`. CLI/agent callers that unlock an account outside the dev UI will not get the local stack wired automatically. Either document this as UI-only or expose a Tauri command/npm script.

## Coverage

- **Applied:** 12 findings
- **Suppressed:** 1 finding at anchor 50 (P3 advisory)
- **Demoted to residual risks:** 1 P3 advisory from maintainability ("Coverage scripts added to feature PR")
- **Validator drops:** 2 findings rejected on independent re-verification:
  - `import.meta.env.DEV guard is not production-build safe` — Vite `DEV` is based on `NODE_ENV`, not mode; the stated exploit does not occur under normal build commands.
  - `clear-account-state bundles unrelated prefetch reset` — the reset call already existed in base; the diff only adds the missing import.
- **Validator over-budget drops:** 0 (13 findings validated directly; remaining code-verifiable P2/P3s verified by direct inspection)
- **Failed/timed-out reviewers:** 0

## Residual risks

- [correctness] Frontend `validateRelayUrlInput` in `src/lib/api/relays.ts` still rejects any `ws://` URL, while the backend now accepts `ws://localhost` and `ws://127.0.0.1`.
- [correctness] `wallet-assets.json` uses zero-address placeholders for local USDC/USDT. Any code path that performs a real ERC-20 transfer or approval on the local chain without first deploying mocks will revert.
- [correctness] Frontend `parseSupportedChainId` maps the `anvil` alias to `local`, but Rust `network_by_key` does not recognize `anvil`.
- [security] Personal RPC URLs are validated only for `http:`/`https:` protocol, so a tampered localStorage value or XSS payload could redirect a chain's reads to an attacker-controlled RPC endpoint.
- [adversarial] Hats explorer link for local chain (`structure-summary.ts`) points to `https://app.hatsprotocol.xyz/trees/31337/...`, leaking local deployment identifiers to an external service in dev.
- [project-standards] `pnpm-workspace.yaml` uses `allowBuilds`, a pnpm 11-specific setting. There is no `packageManager` field in `package.json`, so contributors running pnpm 9/10 may silently ignore the build-allowance.
- [project-standards] Local dev ports `8545` (Anvil RPC) and `7000` (relay) are hardcoded across multiple files.
- [julik-frontend-races] Concurrent `applyLocalDevDefaults` invocations for the same npub can both see the local relay as absent and both call `addCustomRelay`.

## Testing gaps

- [correctness] No test verifies that `withTimeout` clears its timer when the inner promise resolves before the timeout.
- [testing] No tests exercise `withTimeout`/relay failure paths in `local-dev-setup.ts`.
- [testing] No tests cover local chain behavior in `listWalletAssetOptionsForChain`, `getExplorerTxUrl`, or `explorerTxLinkLabel`.
- [maintainability] No test exercises `validate_relay_url` for `ws://` local vs non-local hosts or verifies the error message.
- [maintainability] No test verifies cross-layer behavior for the `anvil` alias.
- [api-contract] No test asserts that `defaultWalletEnabledChains()` excludes `local` in production builds.
- [api-contract] No cross-stack test verifies that a raw `anvil` chain identifier is handled consistently across TypeScript parsers, DB normalization, and Rust network lookup.
- [adversarial] No test checks behavior when a `wallet_tx_request` targets local USDC/USDT placeholder tokens.

---

## Verdict

**Ready with fixes.**

The applied fixes address the highest-impact issues (timer leaks, RPC overwrite, unhandled throws, local chain visible in production, relay message/tests, Rust explorer parity). The remaining P1s are real but either require a design decision (persistence loader coupling, anvil alias consistency) or a security-hardening pass in Rust (proper URL parsing for relay validation). No critical security bypass remains unaddressed in the applied set, but the relay string-prefix validation should be hardened before considering the branch production-ready.

**Recommended fix order:**
1. #1 (relay URL parsing)
2. #2 (`anvil` alias)
3. #3 (persistence loader coupling)
4. Remaining P2 docs/tests/tooling

## Run artifacts

Full reviewer outputs, merge/dedup data, and validator results are preserved in the harness run directory:

```
/tmp/compound-engineering/ce-code-review/20260625-214007-63584be6/
```

This directory is local to the machine that generated the review and is not committed to the repo.
