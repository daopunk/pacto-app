import { activeTopNavTab, activeView } from '../../stores/navigation';
import { activeDmId, addPendingDm, composingNewChat } from '../../stores/dm';
import { loadProfile } from '../../stores/profiles';
import { sendDmMessage } from '../api/nostr';
import { getInvokeErrorMessage } from '../utils/tauri-errors';
import type { CommonsBroadcastDto } from './types';
import {
  commonsJoinRequestBlockReason,
  formatCommonsJoinRequestMessage,
  recordJoinRequestSent,
  squadIdFromBroadcast,
  type CommonsJoinRequestPayload,
} from './commons-join-request';

export function openCommonsUserMessage(authorNpub: string): void {
  if (!authorNpub.startsWith('npub1')) return;
  composingNewChat.set(false);
  activeTopNavTab.set('dms');
  activeView.set('hub');
  addPendingDm(authorNpub);
  activeDmId.set(authorNpub);
  void loadProfile(authorNpub);
}

export async function sendCommonsJoinRequest(
  broadcast: CommonsBroadcastDto,
  requesterNpub: string,
  localSquadIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const blockReason = commonsJoinRequestBlockReason(broadcast, requesterNpub, localSquadIds);
  if (blockReason) {
    return { ok: false, error: blockReason };
  }

  const squadId = squadIdFromBroadcast(broadcast);
  const payload: CommonsJoinRequestPayload = {
    type: 'commons_join_request',
    squadId,
    squadName: broadcast.squadName ?? 'Squad',
    squadKind: broadcast.squadKind,
    broadcastEventId: broadcast.eventId,
    requesterNpub,
  };

  try {
    const ok = await sendDmMessage(broadcast.authorNpub, formatCommonsJoinRequestMessage(payload));
    if (!ok) {
      return { ok: false, error: 'Could not send join request.' };
    }
    recordJoinRequestSent(squadId);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: getInvokeErrorMessage(e, 'Could not send join request.') };
  }
}
