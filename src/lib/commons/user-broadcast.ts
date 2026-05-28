import { getLocalActiveCommonsBroadcast, publishCommonsBroadcast } from '../api/commons';
import { getInvokeErrorMessage } from '../utils/tauri-errors';
import type { CommonsBroadcastAudience, CommonsBroadcastDurationHours, CommonsBroadcastLocalState } from './types';
import {
  getActiveCommonsBroadcastLocalState,
  localStateFromDto,
  recordCommonsBroadcastLocalState,
} from './local-broadcast-state';
import { isCommonsUserPublic } from '../../stores/commons-prefs';

export function resolveUserBroadcastAudience(
  audienceNewUser: boolean,
  audienceActiveUser: boolean
): CommonsBroadcastAudience | null {
  if (audienceNewUser && !audienceActiveUser) return 'new_user';
  if (audienceActiveUser && !audienceNewUser) return 'active_user';
  return null;
}

export async function fetchActiveUserCommonsBroadcast(
  npub: string
): Promise<CommonsBroadcastLocalState | null> {
  const local = getActiveCommonsBroadcastLocalState('user', npub);
  if (local) return local;
  try {
    const dto = await getLocalActiveCommonsBroadcast('user', npub);
    if (!dto) return null;
    recordCommonsBroadcastLocalState(dto);
    return localStateFromDto(dto);
  } catch (e) {
    console.warn('[commons] fetchActiveUserCommonsBroadcast failed', e);
    return null;
  }
}

export async function publishUserCommonsBroadcast(input: {
  npub: string;
  message: string;
  durationHours: CommonsBroadcastDurationHours;
  tags: string[];
  audienceNewUser: boolean;
  audienceActiveUser: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCommonsUserPublic()) {
    return { ok: false, error: 'Set Commons visibility to Public in Settings first.' };
  }

  const message = input.message.trim();
  if (!message) {
    return { ok: false, error: 'Message is required.' };
  }
  if (input.tags.length === 0) {
    return { ok: false, error: 'Add at least one tag.' };
  }
  const audience = resolveUserBroadcastAudience(input.audienceNewUser, input.audienceActiveUser);
  if (!audience) {
    return { ok: false, error: 'Select at least one audience.' };
  }

  const active = await fetchActiveUserCommonsBroadcast(input.npub);
  if (active) {
    return { ok: false, error: 'A broadcast is still active. Wait until it expires.' };
  }

  try {
    const dto = await publishCommonsBroadcast({
      subject: 'user',
      message,
      durationHours: input.durationHours,
      tags: input.tags,
      audience,
    });
    recordCommonsBroadcastLocalState(dto);
    return { ok: true };
  } catch (e: unknown) {
    return {
      ok: false,
      error: getInvokeErrorMessage(e, 'Failed to publish broadcast.'),
    };
  }
}
