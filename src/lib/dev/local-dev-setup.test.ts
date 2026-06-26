import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyLocalDevDefaults } from './local-dev-setup';
import { listRelays, addCustomRelay } from '../api/relays';
import type { RelayInfo } from '../api/relays';
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

const APPLIED_FLAG_KEY = 'pacto_local_dev_defaults_applied_v1_npub1test';

describe('applyLocalDevDefaults', () => {
  const npub = 'npub1test';
  let storage: Record<string, string> = {};

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
    });

    vi.mocked(listRelays).mockReset();
    vi.mocked(addCustomRelay).mockReset().mockResolvedValue({ url: 'ws://localhost:7000', enabled: true, mode: 'both' });
    vi.mocked(loadWalletEnabledChains).mockReset().mockReturnValue(['sepolia']);
    vi.mocked(saveWalletEnabledChains).mockReset();
    vi.mocked(loadDefaultRpc).mockReset().mockReturnValue(null);
    vi.mocked(saveDefaultRpc).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('sets the applied flag and skips work on subsequent calls for the same npub', async () => {
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(storage[APPLIED_FLAG_KEY]).toBe('1');

    vi.mocked(listRelays).mockClear();
    await applyLocalDevDefaults(npub);
    expect(listRelays).not.toHaveBeenCalled();
    expect(saveWalletEnabledChains).toHaveBeenCalledTimes(1);
  });

  it('runs again after the applied flag is cleared', async () => {
    vi.mocked(listRelays).mockResolvedValue([]);
    await applyLocalDevDefaults(npub);
    expect(storage[APPLIED_FLAG_KEY]).toBe('1');

    delete storage[APPLIED_FLAG_KEY];
    await applyLocalDevDefaults(npub);
    expect(listRelays).toHaveBeenCalledTimes(2);
  });

  it('shares one execution for concurrent calls with the same npub', async () => {
    vi.mocked(listRelays).mockResolvedValue([]);
    await Promise.all([
      applyLocalDevDefaults(npub),
      applyLocalDevDefaults(npub),
    ]);
    expect(listRelays).toHaveBeenCalledTimes(1);
    expect(saveWalletEnabledChains).toHaveBeenCalledTimes(1);
  });

  it('does not call addCustomRelay when listRelays hangs past the timeout', async () => {
    vi.useFakeTimers();
    try {
      const { promise: hang } = Promise.withResolvers<RelayInfo[]>();
      vi.mocked(listRelays).mockImplementation(() => hang);
      const promise = applyLocalDevDefaults(npub);
      vi.advanceTimersByTime(5_000);
      await promise;
      expect(addCustomRelay).not.toHaveBeenCalled();
      expect(storage[APPLIED_FLAG_KEY]).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('logs a warning and does not throw when listRelays rejects', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(listRelays).mockRejectedValue(new Error('network down'));
    await expect(applyLocalDevDefaults(npub)).resolves.not.toThrow();
    expect(addCustomRelay).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[local-dev] failed to add local relay:', 'network down');
    warnSpy.mockRestore();
  });

  it('clears the timeout timer when listRelays resolves quickly', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(listRelays).mockResolvedValue([]);
      await applyLocalDevDefaults(npub);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
