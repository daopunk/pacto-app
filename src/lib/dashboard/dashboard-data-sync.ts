import { get } from 'svelte/store';
import { currentUser } from '../../stores/auth';
import { treasurySafesByParentId, squadInfraByParentId } from '../../stores/squads';
import { listParentTreasurySafes } from '../api/nostr';
import { listSquadInfra } from '../governance/api';
import { persistTreasurySafesForParent, treasurySafesFetchedAtMs } from './treasury-safes-cache';
import { persistSquadInfraForParent, squadInfraFetchedAtMs } from './squad-infra-cache';
import { setSquadInfraFetchMeta, setTreasurySafesFetchMeta } from './dashboard-fetch-meta';

function activeNpub(): string | null {
  return get(currentUser)?.npub ?? null;
}

export async function syncTreasurySafesForParent(parentId: string): Promise<void> {
  if (!parentId) return;
  const npub = activeNpub();
  setTreasurySafesFetchMeta(parentId, {
    loading: true,
    error: null,
    fetchedAtMs: npub ? treasurySafesFetchedAtMs(npub, parentId) : null,
  });
  try {
    const rows = await listParentTreasurySafes(parentId);
    treasurySafesByParentId.update((m) => ({ ...m, [parentId]: rows }));
    if (npub) persistTreasurySafesForParent(npub, parentId, rows);
    else setTreasurySafesFetchMeta(parentId, { loading: false, error: null, fetchedAtMs: Date.now() });
  } catch (e) {
    setTreasurySafesFetchMeta(parentId, {
      loading: false,
      error: (e as Error)?.message ?? 'Could not refresh treasury safes.',
      fetchedAtMs: npub ? treasurySafesFetchedAtMs(npub, parentId) : null,
    });
  }
}

export async function syncSquadInfraForParent(parentId: string): Promise<void> {
  if (!parentId) return;
  const npub = activeNpub();
  setSquadInfraFetchMeta(parentId, {
    loading: true,
    error: null,
    fetchedAtMs: npub ? squadInfraFetchedAtMs(npub, parentId) : null,
  });
  try {
    const rows = await listSquadInfra(parentId);
    squadInfraByParentId.update((m) => ({ ...m, [parentId]: rows }));
    if (npub) persistSquadInfraForParent(npub, parentId, rows);
    else setSquadInfraFetchMeta(parentId, { loading: false, error: null, fetchedAtMs: Date.now() });
  } catch (e) {
    setSquadInfraFetchMeta(parentId, {
      loading: false,
      error: (e as Error)?.message ?? 'Could not refresh squad infra.',
      fetchedAtMs: npub ? squadInfraFetchedAtMs(npub, parentId) : null,
    });
  }
}
