/**
 * Virtual bucket routing for squad/network default channels when one MLS group backs
 * announcements, monitor, and polls. Matches docs/mls/VIRTUAL_CHANNEL_ROUTING_ADR.md (client-side;
 * rumor tags are not available on DmMessage).
 */

import {
  parseAnnouncement,
  ANNOUNCE_TYPE_DASHBOARD_POLL_CREATED,
  ANNOUNCE_TYPE_GOVERNANCE_UPDATED,
  ANNOUNCE_TYPE_SAFE_PROPOSAL,
  ANNOUNCE_TYPE_SQUAD_MEMBER_EVM_SHARE,
  ANNOUNCE_TYPE_SQUAD_SAFE_UPDATED,
  type AnnounceMessage,
} from '../announcements';

export type VirtualBucket = 'announcements' | 'monitor' | 'polls';

/** Separator between MLS parent id and bucket in {@link groupTimelineKey} (not valid in hex MLS ids). */
export const GROUP_TIMELINE_KEY_SEP = '\x1f';

export function groupTimelineKey(parentGroupId: string, bucket: VirtualBucket): string {
  return `${parentGroupId}${GROUP_TIMELINE_KEY_SEP}${bucket}`;
}

export function parseGroupTimelineKey(key: string): { parentGroupId: string; bucket: VirtualBucket } | null {
  const i = key.indexOf(GROUP_TIMELINE_KEY_SEP);
  if (i <= 0) return null;
  const parentGroupId = key.slice(0, i);
  const bucket = key.slice(i + GROUP_TIMELINE_KEY_SEP.length);
  if (bucket !== 'announcements' && bucket !== 'monitor' && bucket !== 'polls') return null;
  return { parentGroupId, bucket };
}

export interface ChannelLike {
  name: string;
  groupId: string;
  order: number;
}

const DEFAULT_TRIO = ['announcements', 'monitor', 'polls'] as const;

/** True when #announcements, #monitor, and #polls exist and share one MLS group id. */
export function defaultTrioSharesSingleMlsGroup(channels: ChannelLike[]): boolean {
  const byName = new Map(channels.map((c) => [c.name, c]));
  const ann = byName.get(DEFAULT_TRIO[0]);
  const mon = byName.get(DEFAULT_TRIO[1]);
  const pol = byName.get(DEFAULT_TRIO[2]);
  if (!ann || !mon || !pol) return false;
  const gid = ann.groupId.trim();
  return gid.length > 0 && gid === mon.groupId.trim() && gid === pol.groupId.trim();
}

/**
 * Pick which sidebar row is selected when several channels share the same MLS group id.
 */
export function resolveHubChannelNameForGroupSelection(
  channels: ChannelLike[],
  groupId: string | null | undefined,
  preferredName: string | null | undefined
): string | null {
  const gid = groupId?.trim();
  if (!gid) return null;
  const sorted = [...channels].sort((a, b) => a.order - b.order);
  const matches = sorted.filter((c) => c.groupId === gid);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].name;
  const pref = preferredName?.trim();
  if (pref && matches.some((c) => c.name === pref)) return pref;
  return [...matches].sort((a, b) => a.order - b.order)[0]?.name ?? null;
}

/** ADR derivation order (tags omitted — not on message model). */
export function deriveVirtualBucketFromMessageContent(content: string | undefined | null): VirtualBucket {
  const trimmed = (content ?? '').trim();
  if (!trimmed.startsWith('{')) return 'announcements';

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return 'announcements';
  }
  if (!parsed || typeof parsed !== 'object') return 'announcements';
  const rec = parsed as Record<string, unknown>;

  const vb = rec['pacto_virtual_bucket'];
  if (vb === 'announcements' || vb === 'monitor' || vb === 'polls') return vb;

  if (
    rec['schema'] === 'pacto.dashboard_poll.v1' &&
    rec['action'] === 'vote' &&
    typeof rec['parent_id'] === 'string' &&
    typeof rec['poll_id'] === 'string' &&
    typeof rec['option_id'] === 'string'
  ) {
    return 'polls';
  }

  const ann = parseAnnouncement(trimmed);
  if (ann?.type === ANNOUNCE_TYPE_DASHBOARD_POLL_CREATED) return 'polls';
  if (ann?.type === ANNOUNCE_TYPE_SQUAD_MEMBER_EVM_SHARE) return 'monitor';
  if (
    ann?.type === ANNOUNCE_TYPE_SQUAD_SAFE_UPDATED ||
    ann?.type === ANNOUNCE_TYPE_SAFE_PROPOSAL ||
    ann?.type === ANNOUNCE_TYPE_GOVERNANCE_UPDATED
  ) {
    return 'monitor';
  }

  return 'announcements';
}

/** Automation-shaped announces belong in **monitor** for MLS timeline partitioning (ADR). */
export function isMonitorOnlyStructuredAnnounce(parsed: AnnounceMessage): boolean {
  switch (parsed.type) {
    case ANNOUNCE_TYPE_SQUAD_SAFE_UPDATED:
    case ANNOUNCE_TYPE_SAFE_PROPOSAL:
    case ANNOUNCE_TYPE_SQUAD_MEMBER_EVM_SHARE:
    case ANNOUNCE_TYPE_GOVERNANCE_UPDATED:
      return true;
    default:
      return false;
  }
}

/**
 * Prefer rendering structured automation rows only when the message resolves to **monitor**, matching SQLite ingest gates.
 */
export function announceCardAllowedForTimelineBucket(
  parsed: AnnounceMessage,
  msg: { virtual_bucket?: string | null; content?: string | null },
): boolean {
  if (!isMonitorOnlyStructuredAnnounce(parsed)) return true;
  return resolveVirtualBucketForTimelineMessage(msg) === 'monitor';
}

/** Minimal shape for partitioning MLS timelines by derived bucket (issue 3 spike). */
export interface TimelinePartitionMessage {
  content?: string | null;
  at: number;
  /** From Tauri `Message.virtual_bucket` when persisted (issue 6). */
  virtual_bucket?: string | null;
}

/** Prefer backend-normalized bucket when present; otherwise derive from content (ADR). */
export function resolveVirtualBucketForTimelineMessage(m: {
  content?: string | null;
  virtual_bucket?: string | null;
}): VirtualBucket {
  const pb = m.virtual_bucket?.trim();
  if (pb === 'announcements' || pb === 'monitor' || pb === 'polls') return pb;
  return deriveVirtualBucketFromMessageContent(m.content);
}

/**
 * Build a map keyed by `groupTimelineKey(parentGroupId, virtualBucket)` from raw MLS timelines keyed by physical group id.
 * Same message object references as input; sorts each bucket by `at`.
 */
export function buildBackendGroupTimelineMessages<T extends TimelinePartitionMessage>(
  byGroup: Record<string, T[] | undefined>
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const [groupId, msgs] of Object.entries(byGroup)) {
    if (!msgs?.length) continue;
    for (const m of msgs) {
      const b = resolveVirtualBucketForTimelineMessage(m);
      const k = groupTimelineKey(groupId, b);
      (out[k] ??= []).push(m);
    }
  }
  for (const arr of Object.values(out)) {
    arr.sort((a, b) => a.at - b.at);
  }
  return out;
}
