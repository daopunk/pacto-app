import { invoke } from "@tauri-apps/api/core";

// Type definitions matching Rust structs
export interface LoginKeyPair {
  public: string;
  private: string;
}

/**
 * Login with a private key (generates or imports)
 * @param importKey - Private key in hex or nsec format, empty string to generate new
 * @returns Public and private keys
 */
export async function login(importKey: string = ''): Promise<LoginKeyPair> {
  return await invoke('login', { importKey });
}

/**
 * Check if any account exists on this device
 * @returns True if at least one account exists
 */
export async function checkAnyAccountExists(): Promise<boolean> {
  return await invoke('check_any_account_exists');
}

/**
 * Get the current active account npub
 * @returns Current account npub or error
 */
export async function getCurrentAccount(): Promise<string> {
  return await invoke('get_current_account');
}

/**
 * List all accounts on this device
 * @returns Array of account npubs
 */
export async function listAllAccounts(): Promise<string[]> {
  return await invoke('list_all_accounts');
}

