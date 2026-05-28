import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMONS_FEED_FILTERS,
  filterCommonsBroadcasts,
  prepareCommonsFeed,
  sortCommonsBroadcasts,
} from './commons-feed';
import type { CommonsBroadcastDto } from './types';

const now = Math.floor(Date.now() / 1000);

function row(overrides: Partial<CommonsBroadcastDto> & Pick<CommonsBroadcastDto, 'eventId'>): CommonsBroadcastDto {
  return {
    authorNpub: 'npub1',
    subject: 'user',
    subjectId: 'npub1',
    message: 'hello',
    durationHours: 24,
    expiresAt: now + 3600,
    tags: ['neo'],
    createdAt: now,
    ...overrides,
  };
}

describe('filterCommonsBroadcasts', () => {
  it('drops expired broadcasts', () => {
    const list = filterCommonsBroadcasts(
      [row({ eventId: 'a', expiresAt: now - 1 })],
      DEFAULT_COMMONS_FEED_FILTERS,
      now
    );
    expect(list).toHaveLength(0);
  });

  it('filters by subject', () => {
    const squads = filterCommonsBroadcasts(
      [
        row({ eventId: 'u', subject: 'user', subjectId: 'npub1' }),
        row({ eventId: 's', subject: 'squad', subjectId: 'g1', squadName: 'Alpha' }),
      ],
      { ...DEFAULT_COMMONS_FEED_FILTERS, subjectFilter: 'squads' },
      now
    );
    expect(squads.map((b) => b.eventId)).toEqual(['s']);
  });

  it('matches any tag', () => {
    const list = filterCommonsBroadcasts(
      [
        row({ eventId: 'a', tags: ['neo'] }),
        row({ eventId: 'b', tags: ['dao'] }),
      ],
      { ...DEFAULT_COMMONS_FEED_FILTERS, tags: ['neo', 'dao'], tagMatchMode: 'any' },
      now
    );
    expect(list.map((b) => b.eventId).sort()).toEqual(['a', 'b']);
  });

  it('matches all tags', () => {
    const list = filterCommonsBroadcasts(
      [
        row({ eventId: 'a', tags: ['neo', 'dao'] }),
        row({ eventId: 'b', tags: ['neo'] }),
      ],
      { ...DEFAULT_COMMONS_FEED_FILTERS, tags: ['neo', 'dao'], tagMatchMode: 'all' },
      now
    );
    expect(list.map((b) => b.eventId)).toEqual(['a']);
  });

  it('filters user audience', () => {
    const list = filterCommonsBroadcasts(
      [
        row({ eventId: 'n', audience: 'new_user' }),
        row({ eventId: 'a', audience: 'active_user' }),
      ],
      { ...DEFAULT_COMMONS_FEED_FILTERS, audienceFilter: 'new_user' },
      now
    );
    expect(list.map((b) => b.eventId)).toEqual(['n']);
  });
});

describe('sortCommonsBroadcasts', () => {
  it('sorts newest created_at first', () => {
    const sorted = sortCommonsBroadcasts([
      row({ eventId: 'old', createdAt: 1 }),
      row({ eventId: 'new', createdAt: 99 }),
    ]);
    expect(sorted.map((b) => b.eventId)).toEqual(['new', 'old']);
  });
});

describe('prepareCommonsFeed', () => {
  it('dedupes by author subject keeping newest', () => {
    const list = prepareCommonsFeed(
      [
        row({ eventId: 'old', createdAt: 1 }),
        row({ eventId: 'new', createdAt: 50 }),
      ],
      DEFAULT_COMMONS_FEED_FILTERS
    );
    expect(list).toHaveLength(1);
    expect(list[0].eventId).toBe('new');
  });
});
