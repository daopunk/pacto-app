import { writable } from 'svelte/store';

// UI state stores - what's currently selected
export const activeCommunityId = writable<string | null>(null);
export const activeChannelId = writable<string | null>(null);

// Mock data - replace with Nostr relay data later
export const communities = writable([
  {
    id: 'community-1',
    name: 'Community One',
    image: '',
    channels: [
      { id: 'channel-1', name: 'general', type: 'text' },
      { id: 'channel-2', name: 'random', type: 'text' },
      { id: 'channel-3', name: 'announcements', type: 'text' },
    ]
  },
  {
    id: 'community-2',
    name: 'Community Two',
    image: '',
    channels: [
      { id: 'channel-4', name: 'welcome', type: 'text' },
      { id: 'channel-5', name: 'dev-chat', type: 'text' },
    ]
  }
]);

