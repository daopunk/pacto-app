/** Squad-pair creation helpers — see ai-docs/networks/RNF_PLAN.md */

import { getAnnouncementsChannel } from './parent-navbar';
import type { PairedSquads } from './squad-pair';
import type { Squad } from '../stores/app';

export interface SquadPairAnchorRef {
  id: string;
  name: string;
}

/** Regular squads the user can pair with (excludes anchor and existing squad-pairs). */
export function partnerSquadCandidates(allSquads: Squad[], anchorSquadId: string): Squad[] {
  return allSquads.filter(
    (s) =>
      s.id !== anchorSquadId &&
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
