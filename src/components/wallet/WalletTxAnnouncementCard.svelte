<script lang="ts">
  import type { WalletTxAnnouncementPayload } from '../../lib/wallet/dm-messages';
  import { getWalletNetworkDisplayName, getExplorerTxUrl } from '../../lib/wallet/assets';

  export let payload: WalletTxAnnouncementPayload;

  $: networkLabel = getWalletNetworkDisplayName(payload.network);
  $: explorerUrl = getExplorerTxUrl(payload.network, payload.tx_hash);
</script>

<div class="wallet-tx-announce-card" role="article">
  <div class="wallet-tx-announce-icon" aria-hidden="true">✓</div>
  <div class="wallet-tx-announce-body">
    <p class="wallet-tx-announce-badge">Transfer confirmed</p>
    <p class="wallet-tx-announce-title">{payload.amount} {payload.asset}</p>
    <p class="wallet-tx-announce-subtitle">{networkLabel}</p>
    <p class="wallet-tx-announce-hash" title={payload.tx_hash}>
      {payload.tx_hash.slice(0, 10)}…{payload.tx_hash.slice(-8)}
    </p>
    {#if explorerUrl}
      <a
        class="wallet-tx-announce-link"
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View on explorer
      </a>
    {/if}
  </div>
</div>

<style>
  .wallet-tx-announce-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 8px 16px;
    padding: 12px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 8px;
    max-width: 380px;
    border-left: 3px solid var(--success);
  }

  .wallet-tx-announce-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    background: #24804630;
    color: var(--success);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .wallet-tx-announce-body {
    flex: 1;
    min-width: 0;
  }

  .wallet-tx-announce-badge {
    margin: 0 0 2px 0;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--success);
  }

  .wallet-tx-announce-title {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .wallet-tx-announce-subtitle {
    margin: 0 0 6px 0;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .wallet-tx-announce-hash {
    margin: 0 0 8px 0;
    font-size: 0.75rem;
    font-family: ui-monospace, monospace;
    color: var(--text-secondary);
    word-break: break-all;
  }

  .wallet-tx-announce-link {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--accent);
    text-decoration: none;
  }

  .wallet-tx-announce-link:hover {
    text-decoration: underline;
  }
</style>
