import { invoke } from "@tauri-apps/api/core";

/**
 * Represents a user status
 */
export interface Status {
  title: string;
  purpose: string;
  url: string;
}

/**
 * Represents a user profile
 */
export interface NostrProfile {
  id: string;
  name: string;
  avatar: string;
  last_read: string;
  status: Status;
  last_updated: number;
  typing_until: number;
  mine: boolean;
  // Extended fields from Rust backend
  display_name: string;
  nickname: string;
  lud06: string;
  lud16: string;
  banner: string;
  about: string;
  website: string;
  nip05: string;
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
