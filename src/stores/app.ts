import { writable } from 'svelte/store';

// UI state stores - what's currently selected
export const activeCommunityId = writable<string | null>(null);
export const activeChannelId = writable<string | null>(null);

// View state - which main view is active
export type ViewType = 'hub' | 'profile';
export const activeView = writable<ViewType>('hub');

// Communities store - will be populated from Nostr relay data
export const communities = writable<any[]>([]);

// Messages store organized by channelId - will be populated from Nostr relay data
export const channelMessages = writable<Record<string, any[]>>({});

