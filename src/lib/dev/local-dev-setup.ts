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

async function ensureLocalRelay(): Promise<void> {
  try {
    const relays = await listRelays();
    const alreadyAdded = relays.some(
      (r) => r.url.toLowerCase() === LOCAL_RELAY_URL.toLowerCase(),
    );
    if (alreadyAdded) return;
    await addCustomRelay(LOCAL_RELAY_URL, 'both');
    console.log('[local-dev] added local relay', LOCAL_RELAY_URL);
  } catch (e) {
    console.warn('[local-dev] failed to add local relay:', e);
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
  if (current === LOCAL_RPC_URL) return;
  saveDefaultRpc(npub, LOCAL_CHAIN_ID, LOCAL_RPC_URL);
  console.log('[local-dev] set local default RPC', LOCAL_RPC_URL);
}

export async function applyLocalDevDefaults(npub: string | null | undefined): Promise<void> {
  if (!import.meta.env.DEV || !npub) return;

  // Run in parallel where possible; failures are logged, not thrown.
  await ensureLocalRelay();
  ensureLocalChainEnabled(npub);
  ensureLocalDefaultRpc(npub);
}
