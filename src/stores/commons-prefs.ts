import { writable, get } from 'svelte/store';
import { persistenceKey } from './persistence-context';

export type CommonsUserVisibility = 'private' | 'public';

export interface CommonsUserPrefs {
  visibility: CommonsUserVisibility;
}

export const PACTO_COMMONS_PROFILE_PREFIX = 'pacto_commons_profile';

export const DEFAULT_COMMONS_USER_PREFS: CommonsUserPrefs = { visibility: 'private' };

export const commonsUserPrefs = writable<CommonsUserPrefs>(DEFAULT_COMMONS_USER_PREFS);

export function normalizeCommonsUserPrefs(raw: unknown): CommonsUserPrefs {
  if (raw && typeof raw === 'object' && (raw as CommonsUserPrefs).visibility === 'public') {
    return { visibility: 'public' };
  }
  return { visibility: 'private' };
}

export function hydrateCommonsUserPrefsFromDisk(npub: string): void {
  if (typeof localStorage === 'undefined') {
    commonsUserPrefs.set(DEFAULT_COMMONS_USER_PREFS);
    return;
  }
  const key = `${PACTO_COMMONS_PROFILE_PREFIX}_${npub}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      commonsUserPrefs.set(DEFAULT_COMMONS_USER_PREFS);
      return;
    }
    commonsUserPrefs.set(normalizeCommonsUserPrefs(JSON.parse(raw)));
  } catch {
    commonsUserPrefs.set(DEFAULT_COMMONS_USER_PREFS);
  }
}

export function resetCommonsUserPrefs(): void {
  commonsUserPrefs.set(DEFAULT_COMMONS_USER_PREFS);
}

export function setCommonsUserVisibility(visibility: CommonsUserVisibility): void {
  commonsUserPrefs.update((prefs) => ({ ...prefs, visibility }));
}

export function isCommonsUserPublic(): boolean {
  return get(commonsUserPrefs).visibility === 'public';
}

commonsUserPrefs.subscribe((prefs) => {
  if (typeof localStorage === 'undefined') return;
  const key = persistenceKey(PACTO_COMMONS_PROFILE_PREFIX);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // ignore quota
  }
});
