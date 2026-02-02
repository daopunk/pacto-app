import { convertFileSrc } from '@tauri-apps/api/core';
import type { NostrProfile } from '../api/nostr';

/**
 * Get the best avatar URL for a profile
 * Prefers cached local file (for offline support), falls back to remote URL
 * @param profile - The profile object
 * @returns The avatar URL to use, or null if none available
 */
export function getProfileAvatarSrc(profile: NostrProfile | null | undefined): string | null {
  if (!profile) return null;
  
  // Prefer cached local path for offline support
  if (profile.avatar_cached) {
    return convertFileSrc(profile.avatar_cached);
  }
  
  // Fall back to remote URL
  return profile.avatar || null;
}

/**
 * Get the best banner URL for a profile
 * Prefers cached local file (for offline support), falls back to remote URL
 * @param profile - The profile object
 * @returns The banner URL to use, or null if none available
 */
export function getProfileBannerSrc(profile: NostrProfile | null | undefined): string | null {
  if (!profile) return null;
  
  // Prefer cached local path for offline support
  if (profile.banner_cached) {
    return convertFileSrc(profile.banner_cached);
  }
  
  // Fall back to remote URL
  return profile.banner || null;
}
