/**
 * Shared logic for squad and network sidebars (ParentNavbar behaviour).
 * Used by ParentNavbar.svelte so squad and network behaviour is not duplicated.
 */
import {
  ANNOUNCEMENTS_CHANNEL_NAME,
  MONITOR_CHANNEL_NAME,
  POLLS_CHANNEL_NAME,
  type Channel,
} from '../stores/app';
import { createGroupChat, getMlsGroupMembers } from './api/nostr';

/** Parent-like shape: has an ordered list of channels (squad or network). */
export interface ParentWithChannels {
  channels: Channel[];
}

/**
 * Return the announcements channel for a parent (squad or network), or the first channel by order.
 */
export function getAnnouncementsChannel(parent: ParentWithChannels): Channel {
  return (
    parent.channels.find((c) => c.name === ANNOUNCEMENTS_CHANNEL_NAME) ??
    [...parent.channels].sort((a, b) => a.order - b.order)[0]
  );
}

/** `#monitor` MLS channel when present. */
export function getMonitorChannel(parent: ParentWithChannels): Channel | undefined {
  return parent.channels.find((c) => c.name === MONITOR_CHANNEL_NAME);
}

/**
 * MLS group id for automated governance/treasury announce rows — prefers `#monitor`, falls back to `#announcements`.
 */
export function resolveAutomatedAnnounceGroupId(parent: ParentWithChannels): string | null {
  const monitor = getMonitorChannel(parent)?.groupId?.trim();
  if (monitor) return monitor;
  const ann = getAnnouncementsChannel(parent)?.groupId?.trim();
  return ann || null;
}

/**
 * MLS group id for dashboard poll create/vote (Kind **30078** rumors).
 * Always the parent **#announcements** MLS scope — the same physical group as virtual `#polls` under single-group defaults.
 */
export function resolvePollsMlsGroupId(parent: ParentWithChannels): string | null {
  const ann = getAnnouncementsChannel(parent)?.groupId?.trim();
  return ann || null;
}

/** Default squad/network MLS rooms to invite people into (announce → monitor → polls). May share one physical group id. */
export function orderedDefaultInviteChannels(parent: ParentWithChannels): Channel[] {
  const order = [ANNOUNCEMENTS_CHANNEL_NAME, MONITOR_CHANNEL_NAME, POLLS_CHANNEL_NAME];
  return order
    .map((name) => parent.channels.find((c) => c.name === name))
    .filter((c): c is Channel => !!c);
}

/** One entry per physical MLS group id; keeps first channel row per id (announce → monitor → polls order). Skips `creating-*` placeholders. */
export function uniqueChannelsByGroupIdPreservingOrder(channels: Channel[]): Channel[] {
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const ch of channels) {
    const gid = ch.groupId.trim();
    if (!gid || gid.startsWith('creating-') || seen.has(gid)) continue;
    seen.add(gid);
    out.push(ch);
  }
  return out;
}

/**
 * Create one MLS group for the parent default scope; announcements, monitor, and polls sidebar rows share its `groupId`.
 * Parent id remains that MLS id (roster and invites reference this id).
 */
export async function createDefaultParentChannels(
  memberNpubs: string[]
): Promise<{ parentId: string; channels: Channel[] }> {
  const groupId = await createGroupChat(ANNOUNCEMENTS_CHANNEL_NAME, memberNpubs);
  const channels: Channel[] = [
    { name: ANNOUNCEMENTS_CHANNEL_NAME, groupId, order: 0 },
    { name: MONITOR_CHANNEL_NAME, groupId, order: 1 },
    { name: POLLS_CHANNEL_NAME, groupId, order: 2 },
  ];
  return { parentId: groupId, channels };
}

/**
 * Load member npubs for a parent (from its announcements group), excluding the current user.
 * Used for "create channel" member list and invite candidates.
 */
export async function loadMembersForParent(
  parent: ParentWithChannels,
  currentUserNpub: string | undefined
): Promise<string[]> {
  const ann = getAnnouncementsChannel(parent);
  const result = await getMlsGroupMembers(ann.groupId);
  return (result.members ?? []).filter((n) => n !== currentUserNpub);
}
