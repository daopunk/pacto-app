import { writable } from 'svelte/store';
import { mockCommunities, mockChannelMessages } from './mockData';

// UI state stores - what's currently selected
export const activeCommunityId = writable<string | null>(null);
export const activeChannelId = writable<string | null>(null);

// View state - which main view is active
export type ViewType = 'hub' | 'profile';
export const activeView = writable<ViewType>('hub');

// Communities store - replace with Nostr relay data later
export const communities = writable(mockCommunities);

// Messages store organized by channelId - replace with Nostr relay data later
export const channelMessages = writable<Record<string, any[]>>(mockChannelMessages);

