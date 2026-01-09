import { invoke } from "@tauri-apps/api/core";

// Type definitions for Nostr data structures - matches Rust Profile struct
export interface NostrProfile {
  id: string;
  name: string;
  display_name: string;
  nickname: string;
  lud06: string;
  lud16: string;
  banner: string;
  avatar: string;
  about: string;
  website: string;
  nip05: string;
  last_updated: number;
  mine: boolean;
  muted: boolean;
  bot: boolean;
}

/**
 * Fetch a Nostr profile from the Rust backend cache
 * @param npub - The npub (bech32 format) of the user
 * @returns Promise with the user's profile data
 */
export async function fetchNostrProfile(npub: string): Promise<NostrProfile> {
  return await invoke('get_profile', { npub });
}

/**
 * Load a profile from Nostr relays (triggers background fetch and caching)
 * @param npub - The npub (bech32 format) of the user
 * @returns Promise with boolean indicating if load was initiated
 */
export async function loadNostrProfile(npub: string): Promise<boolean> {
  return await invoke('load_profile', { npub });
}
