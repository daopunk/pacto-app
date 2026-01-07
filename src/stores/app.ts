import { writable } from 'svelte/store';
import { mockCommunities } from './mockData';

// UI state stores - what's currently selected
export const activeCommunityId = writable<string | null>(null);
export const activeChannelId = writable<string | null>(null);

// Communities store - replace with Nostr relay data later
export const communities = writable(mockCommunities);

