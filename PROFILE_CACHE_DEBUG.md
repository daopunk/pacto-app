# Profile cache debug plan

## What was wrong (root cause)

1. **DB path mismatch**  
   The app uses `pacto.db` (in `account_manager::get_database_path`), but the **sync** and **login** blocks in `lib.rs` were still:
   - Looking for **`vector.db`** (wrong filename).
   - Login used **`app_local_data_dir()`** instead of the same path as `get_database_path` (which uses **`app_data_dir()`**).

   So:
   - **Current account was never set** (file not found at the checked path).
   - **`get_all_profiles`** then failed (no current account → no DB connection).
   - **`set_profile`** also failed when saving after a relay fetch (same reason).
   - Result: nothing was loaded from or written to the DB; profiles were refetched from relays every time.

2. **Panic on DB load**  
   `get_all_profiles(...).unwrap()` meant any DB error (e.g. missing current account) panicked the backend, so `init_finished` was never emitted and the frontend never got the batch.

## Code changes made

- **Sync block** and **login block** now use `account_manager::get_database_path(handle, &npub)` so they look for **pacto.db** in the correct app data dir and set current account when it exists.
- **DB load** uses `match db::get_all_profiles(...)` and logs on error instead of `unwrap()`, so we still emit `init_finished` with whatever state we have.
- **Debug logs** (you can remove later):
  - Backend: `[Startup] Loaded N profiles from DB`, `[Startup] Emitting init_finished with N profiles, M chats`.
  - Frontend: `[profiles] init_finished: loaded N profiles from cache`.

## Minimal frontend-focused debug plan

1. **Run the app, unlock, use it (open a chat so a profile is fetched from relays), then close and reopen.**

2. **In the terminal (backend):**
   - You should see: `[Login] Set current account for SQL mode: npub1...`
   - Then: `[Startup] Loaded N profiles from DB` with **N ≥ 1** (after you’ve used the app at least once).
   - Then: `[Startup] Emitting init_finished with N profiles, M chats` with **N ≥ 1**.
   - If you see **`[Startup] Failed to load profiles from DB: ...`** then current account or DB path is still wrong.
   - If you never see **`[Startup] Loaded ...`** or **`Emitting init_finished`**, the init path isn’t running (e.g. `state.profiles.len() != 1`).

3. **In the browser DevTools console (frontend):**
   - You should see: **`[profiles] init_finished: loaded N profiles from cache`** with **N ≥ 1**.
   - If N is **0** or you never see this line, either:
     - Backend didn’t emit `init_finished`, or
     - Frontend listener wasn’t registered in time (try opening DevTools before unlock and reload).

4. **If backend shows “Loaded 0 profiles”:**
   - Persistence might still be failing. After a relay fetch, backend should call `set_profile`. Check terminal for Rust/DB errors when opening a profile or chat.
   - Confirm the DB file exists: on macOS, `~/Library/Application Support/com.daopunk.pacto/<your-npub>/pacto.db`.

5. **If backend shows “Loaded N” (N > 0) but frontend shows “loaded 0” or nothing:**
   - `init_finished` is firing before the frontend listener is attached. Ensure the listener in `src/stores/profiles.ts` runs as soon as the app loads (it’s in a top-level async IIFE). If the Svelte app mounts late, consider requesting “current state” from the backend once the frontend is ready, as a fallback.

## Summary

Profiles weren’t cached because **current account was never set** (wrong path/filename in sync and login), so **DB read and write both failed**. The fixes align sync and login with `get_database_path` (pacto.db, app_data_dir) and make DB load non-fatal. Use the logs above to confirm that DB load, init_finished, and frontend cache population all happen on the next run.
