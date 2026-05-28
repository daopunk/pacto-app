/** Squad-pair creation helpers — see ai-docs/networks/RNF_PLAN.md */

import { getAnnouncementsChannel } from './parent-navbar';
import type { PairedSquads } from './squad-pair';
import type { Squad } from '../stores/app';

export interface SquadPairAnchorRef {
  id: string;
  name: string;
}

/** Regular squad used when creating a pair from the active hub. */
export function resolvePairAnchorFromHub(hub: Squad, allSquads: Squad[]): Squad | undefined {
  if (hub.kind !== 'squad-pair') {
    return (hub.channels?.length ?? 0) > 0 ? hub : undefined;
  }
  for (const ref of hub.pairedSquads ?? []) {
    const squad = allSquads.find((s) => s.id === ref.id);
    if (squad && squad.kind !== 'squad-pair' && (squad.channels?.length ?? 0) > 0) {
      return squad;
    }
  }
  return undefined;
}

/** Ids to exclude from the partner picker (other anchors when pairing from a squad-pair hub). */
export function pairPartnerExcludeSquadIds(hub: Squad, anchor: Squad): string[] {
  if (hub.kind !== 'squad-pair') return [];
  return (hub.pairedSquads ?? []).map((p) => p.id).filter((id) => id !== anchor.id);
}

/** Regular squads the user can pair with (excludes anchor, optional extra ids, and squad-pairs). */
export function partnerSquadCandidates(
  allSquads: Squad[],
  anchorSquadId: string,
  alsoExcludeSquadIds: string[] = []
): Squad[] {
  const excluded = new Set([anchorSquadId, ...alsoExcludeSquadIds]);
  return allSquads.filter(
    (s) =>
      !excluded.has(s.id) &&
      s.kind !== 'squad-pair' &&
      (s.channels?.length ?? 0) > 0
  );
}

export function buildPairedSquads(anchor: SquadPairAnchorRef, partner: SquadPairAnchorRef): PairedSquads {
  return [
    { id: anchor.id, name: anchor.name },
    { id: partner.id, name: partner.name },
  ];
}

type MlsMembersResult = { members?: string[] };

/** Union of MLS members from two squads' announcements groups, excluding the current user. */
export async function collectInviteNpubsForSquads(
  squads: Squad[],
  excludeNpub: string | undefined,
  fetchMembers: (announcementsGroupId: string) => Promise<MlsMembersResult>
): Promise<string[]> {
  const allNpubs = new Set<string>();
  for (const squad of squads) {
    const ann = getAnnouncementsChannel(squad);
    if (!ann?.groupId?.trim() || ann.groupId.startsWith('creating-')) {
      throw new Error(`Squad "${squad.name}" has no announcements channel`);
    }
    const result = await fetchMembers(ann.groupId);
    for (const npub of result.members ?? []) {
      if (npub !== excludeNpub) allNpubs.add(npub);
    }
  }
  return [...allNpubs];
}
