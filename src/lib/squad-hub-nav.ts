/**
 * Squad / squad-pair hub navigation (Squads top tab).
 * See ai-docs/networks/RNF_PLAN.md.
 */
import { get } from 'svelte/store';
import {
  activeSquadId,
  activeChannelId,
  activeHubChannelName,
  activeView,
  activeTopNavTab,
  lastChannelBySquadId,
  lastHubChannelNameBySquadId,
  lastOpenedSquadId,
  squads,
  DASHBOARD_CHANNEL_ID,
  type Squad,
} from '../stores/app';
import { resolveHubChannelNameForGroupSelection } from './mls/virtual-channel-bucket';

export function resolveHubParentSquad(allSquads: Squad[], squadId: string | null): Squad | undefined {
  if (!squadId) return undefined;
  return allSquads.find((s) => s.id === squadId);
}

/** Parent open in the hub (dashboard / channels) from `activeSquadId`. */
export function resolveOpenHubParent(allSquads: Squad[], squadId: string | null): Squad | null {
  if (!squadId) return null;
  return allSquads.find((s) => s.id === squadId) ?? null;
}

/** Open any squad or squad-pair in the standard Squads hub. */
export function activateSquadHub(squadId: string): void {
  activeTopNavTab.set('squads');
  const squad = get(squads).find((s) => s.id === squadId);
  if (!squad) return;

  activeSquadId.set(squadId);
  lastOpenedSquadId.set(squadId);
  activeView.set('hub');

  const sorted = [...squad.channels].sort((a, b) => a.order - b.order);
  const firstCh = sorted[0];
  const lastForSquad = get(lastChannelBySquadId)[squadId];
  const lastValid =
    !!lastForSquad &&
    (sorted.some((c) => c.groupId === lastForSquad) || lastForSquad === DASHBOARD_CHANNEL_ID);

  let setChannelId: string | null;
  if (lastValid && lastForSquad === DASHBOARD_CHANNEL_ID) {
    setChannelId = DASHBOARD_CHANNEL_ID;
  } else if (lastValid) {
    setChannelId = sorted.find((c) => c.groupId === lastForSquad)?.groupId ?? firstCh?.groupId ?? null;
  } else {
    setChannelId = firstCh?.groupId ?? null;
  }

  activeChannelId.set(setChannelId);
  if (!setChannelId || setChannelId === DASHBOARD_CHANNEL_ID) {
    activeHubChannelName.set(null);
  } else {
    activeHubChannelName.set(
      resolveHubChannelNameForGroupSelection(
        sorted,
        setChannelId,
        get(lastHubChannelNameBySquadId)[squadId] ?? null
      )
    );
  }
}
