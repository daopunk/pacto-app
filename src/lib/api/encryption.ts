import { invoke } from "@tauri-apps/api/core";

/**
 * Check if an encrypted private key is stored locally
 * @returns True if encrypted key exists
 */
export async function hasStoredKey(): Promise<boolean> {
  try {
    const pkey = await invoke<string | null>('get_pkey');
    return pkey !== null && pkey !== undefined && pkey !== '';
  } catch {
    return false;
  }
}

/**
 * Encrypt and save a private key with a PIN
 * NOTE: Currently stores plaintext - PIN encryption needs to be implemented in Rust
 * @param privateKey - The private key to encrypt
 * @param pin - The 6-digit PIN for encryption
 */
export async function encryptAndSaveKey(privateKey: string, pin: string): Promise<void> {
  // TODO: Implement PIN-based encryption in Rust
  // For now, this stores the key directly (NOT SECURE FOR PRODUCTION)
  console.warn('WARNING: Key encryption not yet implemented. Storing plaintext.');
  await invoke('set_pkey', { pkey: privateKey });
}

/**
 * Load and decrypt a private key using a PIN
 * NOTE: Currently loads plaintext - PIN decryption needs to be implemented in Rust
 * @param pin - The 6-digit PIN for decryption
 * @returns The decrypted private key
 * @throws Error if key doesn't exist or PIN is incorrect
 */
export async function loadAndDecryptKey(pin: string): Promise<string> {
  // TODO: Implement PIN-based decryption in Rust
  // For now, this loads the key directly (NOT SECURE FOR PRODUCTION)
  console.warn('WARNING: Key decryption not yet implemented. Loading plaintext.');
  
  const pkey = await invoke<string | null>('get_pkey');
  
  if (!pkey) {
    throw new Error('No stored key found');
  }
  
  // Simulate delay for decryption
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return pkey;
}

/**
 * Clear stored encrypted key (logout)
 */
export async function clearStoredKey(): Promise<void> {
  // Sets empty string to clear the key
  await invoke('set_pkey', { pkey: '' });
}

/**
 * Validate if a string is a valid Nostr private key format
 * @param key - Private key in hex or nsec format
 * @returns True if valid format
 */
export function validatePrivateKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  
  // Check nsec format (bech32)
  if (trimmed.startsWith('nsec1')) {
    return trimmed.length === 63; // Standard nsec length
  }
  
  // Check hex format
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return true;
  }
  
  return false;
}

