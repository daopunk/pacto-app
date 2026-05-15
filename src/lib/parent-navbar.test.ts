import { describe, expect, it, vi } from 'vitest';

vi.mock('./api/nostr', () => ({
  createGroupChat: vi.fn().mockResolvedValue('mls-single'),
  getMlsGroupMembers: vi.fn(),
}));

import { createGroupChat } from './api/nostr';
import { createDefaultParentChannels, uniqueChannelsByGroupIdPreservingOrder, resolvePollsMlsGroupId } from './parent-navbar';
import {
  ANNOUNCEMENTS_CHANNEL_NAME,
  MONITOR_CHANNEL_NAME,
  POLLS_CHANNEL_NAME,
} from '../stores/app';

describe('createDefaultParentChannels', () => {
  it('creates one MLS group and three channels sharing groupId', async () => {
    const res = await createDefaultParentChannels(['npub1test']);
    expect(createGroupChat).toHaveBeenCalledTimes(1);
    expect(createGroupChat).toHaveBeenCalledWith(ANNOUNCEMENTS_CHANNEL_NAME, ['npub1test']);
    expect(res.parentId).toBe('mls-single');
    expect(res.channels).toHaveLength(3);
    expect(new Set(res.channels.map((c) => c.groupId))).toEqual(new Set(['mls-single']));
    expect(res.channels.map((c) => c.name)).toEqual([
      ANNOUNCEMENTS_CHANNEL_NAME,
      MONITOR_CHANNEL_NAME,
      POLLS_CHANNEL_NAME,
    ]);
    expect(res.channels.map((c) => c.order)).toEqual([0, 1, 2]);
  });
});

describe('resolvePollsMlsGroupId', () => {
  it('returns shared MLS id when announcements and polls use the same group', () => {
    const parent = {
      channels: [
        { name: ANNOUNCEMENTS_CHANNEL_NAME, groupId: 'g', order: 0 },
        { name: MONITOR_CHANNEL_NAME, groupId: 'g', order: 1 },
        { name: POLLS_CHANNEL_NAME, groupId: 'g', order: 2 },
      ],
    };
    expect(resolvePollsMlsGroupId(parent)).toBe('g');
  });

  it('uses announcements MLS scope even when #polls row has a different groupId', () => {
    const parent = {
      channels: [
        { name: ANNOUNCEMENTS_CHANNEL_NAME, groupId: 'ann', order: 0 },
        { name: MONITOR_CHANNEL_NAME, groupId: 'mon', order: 1 },
        { name: POLLS_CHANNEL_NAME, groupId: 'poll', order: 2 },
      ],
    };
    expect(resolvePollsMlsGroupId(parent)).toBe('ann');
  });

  it('falls back to announcements when polls channel row is missing', () => {
    const parent = {
      channels: [{ name: ANNOUNCEMENTS_CHANNEL_NAME, groupId: 'only', order: 0 }],
    };
    expect(resolvePollsMlsGroupId(parent)).toBe('only');
  });
});

describe('uniqueChannelsByGroupIdPreservingOrder', () => {
  it('dedupes by groupId and skips creating placeholders', () => {
    const a = { name: 'announcements', groupId: 'g', order: 0 };
    const b = { name: 'monitor', groupId: 'g', order: 1 };
    expect(uniqueChannelsByGroupIdPreservingOrder([a, b])).toEqual([a]);
    expect(uniqueChannelsByGroupIdPreservingOrder([{ ...a, groupId: 'creating-x' }])).toEqual([]);
  });
});
