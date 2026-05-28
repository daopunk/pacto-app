import type { CommonsBroadcastDto } from './types';

export type CommonsTagMatchMode = 'any' | 'all';
export type CommonsSubjectFilter = 'both' | 'squads' | 'users';
export type CommonsAudienceFilter = 'any' | 'new_user' | 'active_user';

export interface CommonsFeedFilters {
  tags: string[];
  tagMatchMode: CommonsTagMatchMode;
  subjectFilter: CommonsSubjectFilter;
  audienceFilter: CommonsAudienceFilter;
}

export const DEFAULT_COMMONS_FEED_FILTERS: CommonsFeedFilters = {
  tags: [],
  tagMatchMode: 'any',
  subjectFilter: 'both',
  audienceFilter: 'any',
};

export const COMMONS_FEED_REFRESH_MS = 60_000;

export function isCommonsBroadcastActive(
  broadcast: CommonsBroadcastDto,
  nowSecs = Math.floor(Date.now() / 1000)
): boolean {
  return broadcast.expiresAt > nowSecs;
}

export function dedupeCommonsBroadcasts(broadcasts: CommonsBroadcastDto[]): CommonsBroadcastDto[] {
  const byKey = new Map<string, CommonsBroadcastDto>();
  for (const broadcast of broadcasts) {
    const key = `${broadcast.authorNpub}:${broadcast.subject}:${broadcast.subjectId}`;
    const existing = byKey.get(key);
    if (!existing || broadcast.createdAt > existing.createdAt) {
      byKey.set(key, broadcast);
    }
  }
  return [...byKey.values()];
}

export function sortCommonsBroadcasts(broadcasts: CommonsBroadcastDto[]): CommonsBroadcastDto[] {
  return [...broadcasts].sort((a, b) => b.createdAt - a.createdAt);
}

function matchesSubjectFilter(
  broadcast: CommonsBroadcastDto,
  subjectFilter: CommonsSubjectFilter
): boolean {
  if (subjectFilter === 'both') return true;
  if (subjectFilter === 'squads') return broadcast.subject === 'squad';
  return broadcast.subject === 'user';
}

function matchesAudienceFilter(
  broadcast: CommonsBroadcastDto,
  audienceFilter: CommonsAudienceFilter
): boolean {
  if (audienceFilter === 'any') return true;
  if (broadcast.subject !== 'user') return true;
  return broadcast.audience === audienceFilter;
}

function matchesTagFilter(
  broadcast: CommonsBroadcastDto,
  tags: string[],
  tagMatchMode: CommonsTagMatchMode
): boolean {
  if (tags.length === 0) return true;
  const eventTags = new Set(broadcast.tags.map((t) => t.toLowerCase()));
  const selected = tags.map((t) => t.toLowerCase());
  if (tagMatchMode === 'any') {
    return selected.some((t) => eventTags.has(t));
  }
  return selected.every((t) => eventTags.has(t));
}

export function filterCommonsBroadcasts(
  broadcasts: CommonsBroadcastDto[],
  filters: CommonsFeedFilters,
  nowSecs = Math.floor(Date.now() / 1000)
): CommonsBroadcastDto[] {
  return broadcasts
    .filter((b) => isCommonsBroadcastActive(b, nowSecs))
    .filter((b) => matchesSubjectFilter(b, filters.subjectFilter))
    .filter((b) => matchesAudienceFilter(b, filters.audienceFilter))
    .filter((b) => matchesTagFilter(b, filters.tags, filters.tagMatchMode));
}

export function prepareCommonsFeed(broadcasts: CommonsBroadcastDto[], filters: CommonsFeedFilters): CommonsBroadcastDto[] {
  return sortCommonsBroadcasts(filterCommonsBroadcasts(dedupeCommonsBroadcasts(broadcasts), filters));
}
