/**
 * Dev-only convenience: automatically wire the local Docker dev stack into a
 * freshly unlocked account. Applied once per account per dev session and only
 * when `import.meta.env.DEV` is true, so production builds are unaffected.
 *
 * Does not overwrite user changes: it only adds the local relay/RPC/chain when
 * they are missing.
 */

import { addCustomRelay, listRelays } from '../api/relays';
import { loadWalletEnabledChains, saveWalletEnabledChains } from '../wallet/wallet-ui-prefs';
import { loadDefaultRpc, saveDefaultRpc } from '../wallet/rpc-prefs';
import type { SupportedChainId } from '../wallet/chains';

const LOCAL_RELAY_URL = 'ws://localhost:7000';
const LOCAL_RPC_URL = 'http://localhost:8545';
const LOCAL_CHAIN_ID: SupportedChainId = 'local';
const RELAY_TIMEOUT_MS = 5_000;
const APPLIED_FLAG_PREFIX = 'pacto_local_dev_defaults_applied_v1';

const inFlight = new Map<string, Promise<void>>();

function appliedFlagKey(npub: string): string {
  return `${APPLIED_FLAG_PREFIX}_${npub}`;
}

function markApplied(npub: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(appliedFlagKey(npub), '1');
  } catch {
    // ignore storage errors
  }
}

function isApplied(npub: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(appliedFlagKey(npub)) === '1';
  } catch {
    return false;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const { promise: timeoutPromise, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => reject(new Error('timed out')), ms);
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

async function ensureLocalRelay(): Promise<void> {
  try {
    const relays = await withTimeout(listRelays(), RELAY_TIMEOUT_MS);
    const alreadyAdded = relays.some(
      (r) => r.url.toLowerCase() === LOCAL_RELAY_URL.toLowerCase(),
    );
    if (alreadyAdded) return;
    await withTimeout(addCustomRelay(LOCAL_RELAY_URL, 'both'), RELAY_TIMEOUT_MS);
    console.log('[local-dev] added local relay', LOCAL_RELAY_URL);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn('[local-dev] failed to add local relay:', message);
  }
}

function ensureLocalChainEnabled(npub: string): void {
  const chains = loadWalletEnabledChains(npub);
  if (chains.includes(LOCAL_CHAIN_ID)) return;
  saveWalletEnabledChains(npub, [...chains, LOCAL_CHAIN_ID]);
  console.log('[local-dev] enabled local chain');
}

function ensureLocalDefaultRpc(npub: string): void {
  const current = loadDefaultRpc(npub, LOCAL_CHAIN_ID);
  if (current) return;
  saveDefaultRpc(npub, LOCAL_CHAIN_ID, LOCAL_RPC_URL);
  console.log('[local-dev] set local default RPC', LOCAL_RPC_URL);
}

export async function applyLocalDevDefaults(npub: string | null | undefined): Promise<void> {
  if (!import.meta.env.DEV || !npub) return;
  if (isApplied(npub)) return;

  const existing = inFlight.get(npub);
  if (existing) {
    await existing;
    return;
  }

  const run = async (): Promise<void> => {
    try {
      await ensureLocalRelay();
      try {
        ensureLocalChainEnabled(npub);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn('[local-dev] failed to enable local chain:', message);
      }
      try {
        ensureLocalDefaultRpc(npub);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn('[local-dev] failed to set local default RPC:', message);
      }
      markApplied(npub);
    } finally {
      inFlight.delete(npub);
    }
  };

  const promise = run();
  inFlight.set(npub, promise);
  await promise;
}
