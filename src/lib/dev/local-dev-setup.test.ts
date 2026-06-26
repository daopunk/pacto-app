import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyLocalDevDefaults } from './local-dev-setup';
import { listRelays, addCustomRelay } from '../api/relays';
import { loadWalletEnabledChains, saveWalletEnabledChains } from '../wallet/wallet-ui-prefs';
import { loadDefaultRpc, saveDefaultRpc } from '../wallet/rpc-prefs';

vi.mock('../api/relays', () => ({
  listRelays: vi.fn(),
  addCustomRelay: vi.fn(),
}));

vi.mock('../wallet/wallet-ui-prefs', () => ({
  loadWalletEnabledChains: vi.fn(),
  saveWalletEnabledChains: vi.fn(),
}));

vi.mock('../wallet/rpc-prefs', () => ({
  loadDefaultRpc: vi.fn(),
  saveDefaultRpc: vi.fn(),
}));

describe('applyLocalDevDefaults', () => {
  const npub = 'npub1test';

  beforeEach(() => {
    vi.mocked(listRelays).mockReset();
    vi.mocked(addCustomRelay).mockReset().mockResolvedValue({ url: 'ws://localhost:7000', enabled: true, mode: 'both' });
    vi.mocked(loadWalletEnabledChains).mockReset().mockReturnValue(['sepolia']);
    vi.mocked(saveWalletEnabledChains).mockReset();
    vi.mocked(loadDefaultRpc).mockReset().mockReturnValue(null);
    vi.mocked(saveDefaultRpc).mockReset();
  });

  it('does nothing when npub is missing', async () => {
    await applyLocalDevDefaults(null);
    expect(listRelays).not.toHaveBeenCalled();
    expect(saveWalletEnabledChains).not.toHaveBeenCalled();
  });

  it('adds the local relay when absent', async () => {
    vi.mocked(listRelays).mockResolvedValue([{ url: 'wss://relay.example.com', status: 'connected', is_default: true, is_custom: false, enabled: true, mode: 'both' }]);
    await applyLocalDevDefaults(npub);
    expect(addCustomRelay).toHaveBeenCalledWith('ws://localhost:7000', 'both');
  });

  it('skips adding the local relay when already present', async () => {
    vi.mocked(listRelays).mockResolvedValue([{ url: 'ws://localhost:7000', status: 'connected', is_default: false, is_custom: true, enabled: true, mode: 'both' }]);
    await applyLocalDevDefaults(npub);
    expect(addCustomRelay).not.toHaveBeenCalled();
  });

  it('enables the local chain when absent', async () => {
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(saveWalletEnabledChains).toHaveBeenCalledWith(npub, ['sepolia', 'local']);
  });

  it('does not duplicate the local chain when already enabled', async () => {
    vi.mocked(loadWalletEnabledChains).mockReturnValue(['sepolia', 'local']);
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(saveWalletEnabledChains).not.toHaveBeenCalled();
  });

  it('sets the local default RPC when unset', async () => {
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(saveDefaultRpc).toHaveBeenCalledWith(npub, 'local', 'http://localhost:8545');
  });

  it('does not overwrite an existing local default RPC', async () => {
    vi.mocked(loadDefaultRpc).mockReturnValue('http://localhost:8545');
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(saveDefaultRpc).not.toHaveBeenCalled();
  });

  it('preserves a user-set local default RPC that differs from the default', async () => {
    vi.mocked(loadDefaultRpc).mockReturnValue('http://127.0.0.1:8545');
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(saveDefaultRpc).not.toHaveBeenCalled();
  });

  it('does nothing when not in a Vite dev build', async () => {
    const prevDev = (import.meta.env as { DEV?: boolean }).DEV;
    (import.meta.env as { DEV?: boolean }).DEV = false;
    try {
      await applyLocalDevDefaults(npub);
      expect(listRelays).not.toHaveBeenCalled();
      expect(saveWalletEnabledChains).not.toHaveBeenCalled();
      expect(saveDefaultRpc).not.toHaveBeenCalled();
    } finally {
      (import.meta.env as { DEV?: boolean }).DEV = prevDev;
    }
  });
});
