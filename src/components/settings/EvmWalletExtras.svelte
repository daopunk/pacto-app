<script lang="ts">
  import { WALLET_ASSETS_CHAIN_IDS, getWalletNetworkDisplayName } from '../../lib/wallet/assets';
  import type { SupportedChainId } from '../../lib/wallet/chains';
  import {
    DEFAULT_PREFERRED_NETWORK,
    loadPreferredNetwork,
    walletPreferredNetworkTick,
    type PreferredNetworkId,
  } from '../../lib/wallet/preferred-network';
  import type { WatchedErc20Row } from '../../lib/wallet/watched-tokens';
  import { openExternalUrl } from '../../lib/utils/open-external';

  export let accountNpub: string | null = null;
  export let enabledSet: Set<SupportedChainId>;
  export let watchedRows: WatchedErc20Row[] = [];
  /** `all` or one enabled chain; defaults to preferred network per account. */
  export let tokenNetworkFilter: 'all' | SupportedChainId = DEFAULT_PREFERRED_NETWORK;
  export let onToggleChain: (chain: SupportedChainId) => void = () => {};
  export let onRemoveWatchedRow: (row: WatchedErc20Row) => void = () => {};
  export let onImportTokens: () => void = () => {};

  let tokenFilterInitializedFor: string | null = null;
  let lastPreferred: PreferredNetworkId = DEFAULT_PREFERRED_NETWORK;
  let preferredNetwork: PreferredNetworkId = DEFAULT_PREFERRED_NETWORK;

  $: enabledChainIdsOrdered = WALLET_ASSETS_CHAIN_IDS.filter((id) => enabledSet.has(id));

  $: {
    void $walletPreferredNetworkTick;
    preferredNetwork = accountNpub ? loadPreferredNetwork(accountNpub) : DEFAULT_PREFERRED_NETWORK;

    if (accountNpub && accountNpub !== tokenFilterInitializedFor) {
      tokenFilterInitializedFor = accountNpub;
      tokenNetworkFilter = preferredNetwork;
      lastPreferred = preferredNetwork;
    } else if (preferredNetwork !== lastPreferred) {
      if (tokenNetworkFilter === lastPreferred) {
        tokenNetworkFilter = preferredNetwork;
      }
      lastPreferred = preferredNetwork;
    }
  }

  $: if (tokenNetworkFilter !== 'all' && !enabledSet.has(tokenNetworkFilter)) {
    tokenNetworkFilter = 'all';
  }

  $: filteredWatchedRows =
    tokenNetworkFilter === 'all'
      ? watchedRows
      : watchedRows.filter((row) => row.network === tokenNetworkFilter);

  const ALCHEMY_SIGNUP_URL = 'https://www.alchemy.com/';
  const RPC_DOCS_URL = import.meta.env.VITE_WALLET_RPC_DOCS_URL as string | undefined;

  function openRpcDocs() {
    const u = typeof RPC_DOCS_URL === 'string' ? RPC_DOCS_URL.trim() : '';
    if (u.startsWith('http://') || u.startsWith('https://')) {
      openExternalUrl(u);
    }
  }

  function openAlchemySignup() {
    openExternalUrl(ALCHEMY_SIGNUP_URL);
  }
</script>

<section class="evm-extras-section" aria-labelledby="wallet-networks-heading">
  <h2 id="wallet-networks-heading" class="evm-extras-h2">Enabled chains</h2>
  <p class="evm-extras-hint">
    Enable chains you use. At least one must stay on. Affects Send, balances, and the DM wallet sidebar.
  </p>
  <ul class="evm-extras-toggle-list">
    {#each WALLET_ASSETS_CHAIN_IDS as chain (chain)}
      <li>
        <label class="evm-extras-toggle">
          <input
            type="checkbox"
            checked={enabledSet.has(chain)}
            disabled={enabledSet.has(chain) && enabledSet.size <= 1}
            on:change={() => onToggleChain(chain)}
          />
          <span>{getWalletNetworkDisplayName(chain)}</span>
          <span class="evm-extras-chain-id">{chain}</span>
        </label>
      </li>
    {/each}
  </ul>
</section>

<section class="evm-extras-section" aria-labelledby="wallet-tokens-heading">
  <div class="evm-extras-section-head">
    <h2 id="wallet-tokens-heading" class="evm-extras-h2">Tokens to track</h2>
    <button type="button" class="evm-extras-btn" on:click={onImportTokens}>Import tokens</button>
  </div>
  <p class="evm-extras-hint">Tracked assets appear in Send and in the DM wallet sidebar (per network).</p>
  <div class="evm-extras-token-filters">
    <label class="evm-extras-filter-label" for="evm-token-network-select">Network</label>
    <select id="evm-token-network-select" class="evm-extras-select" bind:value={tokenNetworkFilter}>
      <option value="all">All networks</option>
      {#each enabledChainIdsOrdered as chainId (chainId)}
        <option value={chainId}>
          {getWalletNetworkDisplayName(chainId)}{chainId === preferredNetwork ? ' (preferred)' : ''}
        </option>
      {/each}
    </select>
  </div>
  {#if watchedRows.length === 0}
    <p class="evm-extras-empty">No extra tokens yet. Native ETH balances still show when RPCs are available.</p>
  {:else if filteredWatchedRows.length === 0}
    <p class="evm-extras-empty">
      No tokens tracked on {tokenNetworkFilter === 'all' ? 'this filter' : getWalletNetworkDisplayName(tokenNetworkFilter)}.
    </p>
  {:else}
    <ul class="evm-extras-token-list">
      {#each filteredWatchedRows as row (row.id)}
        <li class="evm-extras-token-row">
          <div class="evm-extras-token-meta">
            <span class="evm-extras-token-sym">{row.symbol}</span>
            <span class="evm-extras-token-net">{getWalletNetworkDisplayName(row.network)}</span>
            <code class="evm-extras-token-addr">{row.address.slice(0, 10)}…{row.address.slice(-6)}</code>
            <span class="evm-extras-token-src">{row.source}</span>
          </div>
          <button type="button" class="evm-extras-btn-text" on:click={() => onRemoveWatchedRow(row)}>Remove</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="evm-extras-section" aria-labelledby="wallet-rpc-heading">
  <h2 id="wallet-rpc-heading" class="evm-extras-h2">RPC endpoints</h2>
  <p class="evm-extras-hint">
    Custom RPC URLs use environment variables per chain (for example
    <code class="evm-extras-code">VITE_WALLET_RPC_ARBITRUM</code>). See
    <code class="evm-extras-code">docs/wallet/RPC_AND_VIEM_ARCHITECTURE.md</code>
    in the repository for operator setup.
  </p>
  <div class="evm-extras-rpc-actions">
    <button type="button" class="evm-extras-btn evm-extras-btn-secondary" on:click={openAlchemySignup}>
      Get an Alchemy API key
    </button>
    {#if RPC_DOCS_URL && (RPC_DOCS_URL.startsWith('http://') || RPC_DOCS_URL.startsWith('https://'))}
      <button type="button" class="evm-extras-btn evm-extras-btn-secondary" on:click={openRpcDocs}>
        Open RPC setup guide
      </button>
    {/if}
  </div>
</section>

<section class="evm-extras-section evm-extras-section--last" aria-labelledby="wallet-external-heading">
  <h2 id="wallet-external-heading" class="evm-extras-h2">Using this address in an external wallet</h2>
  <div class="evm-extras-external-copy">
    <p>
      If you want to use the same key pair outside Pacto, import your private key into a well-established wallet app
      (MetaMask, Rabby, etc.). Export one key at a time from the account list above.
    </p>
    <p>
      Pacto is built primarily for <strong>governance</strong> with an in-app wallet for squad operations—not for
      browsing arbitrary DeFi or unreviewed smart contracts. If you need that kind of power-user activity, a dedicated
      external wallet is a better fit; Pacto is not designed to be your everyday wallet across the whole ecosystem.
    </p>
  </div>
</section>

<style>
  .evm-extras-section {
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .evm-extras-section--last {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .evm-extras-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .evm-extras-h2 {
    margin: 0 0 8px;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .evm-extras-section-head .evm-extras-h2 {
    margin-bottom: 0;
  }

  .evm-extras-hint {
    margin: 0 0 14px;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--text-muted);
  }

  .evm-extras-token-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .evm-extras-filter-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .evm-extras-select {
    min-width: 200px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-panel);
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
  }

  .evm-extras-select:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .evm-extras-toggle-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .evm-extras-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 0.9375rem;
    color: var(--text-primary);
  }

  .evm-extras-toggle input {
    accent-color: var(--accent);
  }

  .evm-extras-chain-id {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: var(--font-mono, ui-monospace, monospace);
  }

  .evm-extras-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
  }

  .evm-extras-btn:hover {
    background: var(--accent-hover);
  }

  .evm-extras-btn-secondary {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .evm-extras-btn-secondary:hover {
    background: var(--bg-hover);
  }

  .evm-extras-rpc-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .evm-extras-token-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .evm-extras-token-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-panel);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
  }

  .evm-extras-token-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    min-width: 0;
  }

  .evm-extras-token-sym {
    font-weight: 600;
    color: var(--text-primary);
  }

  .evm-extras-token-net {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  .evm-extras-token-addr {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .evm-extras-token-src {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .evm-extras-btn-text {
    background: none;
    border: none;
    color: var(--danger);
    font-size: 0.8125rem;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .evm-extras-btn-text:hover {
    text-decoration: underline;
  }

  .evm-extras-empty {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .evm-extras-code {
    font-size: 0.8em;
    padding: 2px 6px;
    background: var(--bg-elevated);
    border-radius: 4px;
    word-break: break-all;
  }

  .evm-extras-external-copy {
    padding: 16px 18px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-panel);
  }

  .evm-extras-external-copy p {
    margin: 0 0 12px 0;
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--text-secondary);
  }

  .evm-extras-external-copy p:last-child {
    margin-bottom: 0;
  }
</style>
