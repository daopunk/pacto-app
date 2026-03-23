<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { profiles } from '../../stores/profiles';
  import { currentUser } from '../../stores/auth';
  import { getProfileAvatarSrc, getProfileDisplayName } from '../../lib/utils/profile';
  import {
    getWalletSummary,
    getWalletNetworkDisplayName,
    type WalletSummary,
    type SupportedChainId,
    type WalletTransferSuccessDetail,
  } from '../../lib/wallet';
  import { formatWalletTxAnnouncement } from '../../lib/wallet/dm-messages';
  import { showToast } from '../../stores/toast';
  import {
    walletSendPrefillFromRequest,
    type WalletSendPrefillPayload,
  } from '../../stores/app';
  import WalletSendModal from './WalletSendModal.svelte';
  import WalletRequestModal from './WalletRequestModal.svelte';

  /** Active DM counterparty npub */
  export let npub: string;

  /** Send structured DM text to the active thread (same path as the composer). Used for `wallet_tx_announcement` after a confirmed send. */
  export let postDmPlaintext: ((content: string) => Promise<boolean>) | undefined = undefined;

  /** Vite dev only: posts a fake `wallet_tx_announcement` to validate the thread card. */
  export let onDevPostTestWalletAnnouncement: (() => void | Promise<void>) | undefined = undefined;

  let sendModalOpen = false;
  let requestModalOpen = false;
  /** Form prefill when opening Send from Accept on a payment request card. */
  let sendModalPrefill: WalletSendPrefillPayload | null = null;

  function truncateNpub(n: string): string {
    if (n.length <= 16) return n;
    return n.slice(0, 8) + '…' + n.slice(-4);
  }

  $: contactProfile = npub ? $profiles[npub] : null;
  $: contactAvatarSrc = getProfileAvatarSrc(contactProfile);
  $: contactDisplayName = contactProfile
    ? getProfileDisplayName(contactProfile)
    : npub
      ? truncateNpub(npub)
      : 'Unknown';

  let summaryLoading = true;
  let summaryError: string | null = null;
  let summary: WalletSummary | null = null;

  async function refreshSummary() {
    summaryLoading = true;
    summaryError = null;
    const r = await getWalletSummary();
    summaryLoading = false;
    if (r.ok) {
      summary = r.summary;
    } else {
      summary = null;
      summaryError = r.message;
    }
  }

  async function handleWalletTransferSuccess(detail: WalletTransferSuccessDetail) {
    await refreshSummary();
    const me = get(currentUser)?.npub;
    const sendPlain = postDmPlaintext;
    if (!sendPlain) return;
    if (!me) {
      showToast('Transfer confirmed. Sign in to post the payment note to this chat.');
      return;
    }
    const { result, network, asset, amount } = detail;
    const content = formatWalletTxAnnouncement({
      network,
      asset,
      amount,
      tx_hash: result.txHash,
      from_npub: me,
      to_npub: npub,
      ...(detail.requestId != null && detail.requestId !== ''
        ? { request_id: detail.requestId }
        : {}),
      ...(result.blockNumber != null && result.blockNumber !== ''
        ? { block_number: result.blockNumber }
        : {}),
    });
    try {
      const ok = await sendPlain(content);
      if (!ok) {
        showToast(
          'Transfer confirmed, but the payment note could not be sent. You can mention it manually in chat.'
        );
      }
    } catch {
      showToast('Transfer confirmed, but the payment note could not be sent.');
    }
  }

  onMount(() => {
    refreshSummary();
    const unsub = walletSendPrefillFromRequest.subscribe((v) => {
      if (!v || v.targetNpub !== npub) return;
      walletSendPrefillFromRequest.set(null);
      sendModalPrefill = v;
      sendModalOpen = true;
    });
    return unsub;
  });

  function closeSendModal() {
    sendModalOpen = false;
    sendModalPrefill = null;
  }
</script>

<aside id="wallet-bar" class="wallet-bar" aria-label="Wallet">
  <div class="wallet-bar-header">
    <h2 class="wallet-bar-title">Wallet</h2>
  </div>

  <div class="wallet-bar-peer">
    <p class="wallet-bar-peer-label">With this chat</p>
    <div class="wallet-bar-peer-row">
      <div class="wallet-bar-peer-avatar">
        {#if contactAvatarSrc}
          <img src={contactAvatarSrc} alt="" class="wallet-bar-peer-avatar-img" />
        {:else}
          <span class="wallet-bar-peer-placeholder">{contactDisplayName.charAt(0).toUpperCase()}</span>
        {/if}
      </div>
      <div class="wallet-bar-peer-text">
        <span class="wallet-bar-peer-name">{contactDisplayName}</span>
        <span class="wallet-bar-peer-npub">{truncateNpub(npub)}</span>
      </div>
    </div>
    <p class="wallet-bar-hint">
      Send and Request apply to this contact. Use the wallet button in the chat header to hide this panel.
    </p>
  </div>

  <section class="wallet-bar-section" aria-labelledby="wallet-balance-heading">
    <div class="wallet-bar-section-head">
      <h3 id="wallet-balance-heading" class="wallet-bar-section-title">Balance</h3>
      <button
        type="button"
        class="wallet-bar-refresh"
        disabled={summaryLoading}
        on:click={refreshSummary}
        aria-label="Refresh balances"
      >
        {summaryLoading ? '…' : 'Refresh'}
      </button>
    </div>
    {#if summaryLoading && !summary}
      <p class="wallet-bar-placeholder">Loading balances…</p>
    {:else if summaryError}
      <p class="wallet-bar-error" role="alert">{summaryError}</p>
    {:else if summary}
      <p class="wallet-bar-total">
        Total (approx.) <strong>${summary.totalUsdApprox.toFixed(2)}</strong>
        <span class="wallet-bar-total-meta">via {summary.prices.source}</span>
      </p>
      <ul class="wallet-bar-netlist">
        {#each summary.networks as net (net.network)}
          <li class="wallet-bar-net">
            <span class="wallet-bar-net-name">{getWalletNetworkDisplayName(net.network as SupportedChainId)}</span>
            <ul class="wallet-bar-assets">
              {#each net.assets as a (a.symbol)}
                <li>
                  <span class="wallet-bar-asset-sym">{a.symbol}</span>
                  <span class="wallet-bar-asset-amt" title={a.balanceRaw}>{a.balanceDecimal}</span>
                </li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="wallet-bar-placeholder">No balance data.</p>
    {/if}
  </section>

  <div class="wallet-bar-actions">
    <button
      type="button"
      class="wallet-bar-btn wallet-bar-btn-primary"
      on:click={() => {
        sendModalPrefill = null;
        sendModalOpen = true;
      }}
    >
      Send
    </button>
    <button type="button" class="wallet-bar-btn wallet-bar-btn-secondary" on:click={() => (requestModalOpen = true)}>
      Request
    </button>
    {#if onDevPostTestWalletAnnouncement}
      <button
        type="button"
        class="wallet-bar-btn wallet-bar-btn-dev"
        title="Sends a valid wallet_tx_announcement JSON with a fake tx hash (development builds only)."
        on:click={() => onDevPostTestWalletAnnouncement?.()}
      >
        Post test announcement (dev)
      </button>
    {/if}
  </div>
</aside>

{#if sendModalOpen}
  <WalletSendModal
    {npub}
    peerDisplayName={contactDisplayName}
    formPrefill={sendModalPrefill}
    onClose={closeSendModal}
    onTransferSuccess={handleWalletTransferSuccess}
  />
{/if}
{#if requestModalOpen}
  <WalletRequestModal
    {npub}
    peerDisplayName={contactDisplayName}
    postDmPlaintext={postDmPlaintext}
    onClose={() => (requestModalOpen = false)}
  />
{/if}

<style>
  .wallet-bar {
    flex: 0 0 min(320px, 32vw);
    min-width: 240px;
    max-width: 360px;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--bg-elevated);
    background-color: var(--bg-hover);
    box-sizing: border-box;
  }

  .wallet-bar-header {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--bg-elevated);
    flex-shrink: 0;
  }

  .wallet-bar-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .wallet-bar-peer {
    padding: 16px;
    border-bottom: 1px solid var(--bg-elevated);
    flex-shrink: 0;
  }

  .wallet-bar-peer-label {
    margin: 0 0 10px;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .wallet-bar-peer-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .wallet-bar-peer-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background-color: var(--border);
  }

  .wallet-bar-peer-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wallet-bar-peer-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 1rem;
    color: #fff;
    background-color: var(--accent);
  }

  .wallet-bar-peer-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .wallet-bar-peer-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wallet-bar-peer-npub {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: ui-monospace, monospace;
  }

  .wallet-bar-hint {
    margin: 10px 0 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .wallet-bar-section {
    padding: 16px;
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .wallet-bar-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .wallet-bar-section-head .wallet-bar-section-title {
    margin: 0;
  }

  .wallet-bar-section-title {
    margin: 0 0 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .wallet-bar-refresh {
    flex-shrink: 0;
    padding: 4px 8px;
    font-size: 0.6875rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
  }

  .wallet-bar-refresh:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .wallet-bar-total {
    margin: 0 0 12px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .wallet-bar-total strong {
    color: var(--text-primary);
  }

  .wallet-bar-total-meta {
    display: block;
    margin-top: 4px;
    font-size: 0.6875rem;
    color: var(--text-muted);
  }

  .wallet-bar-error {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--error, #c44);
    line-height: 1.35;
  }

  .wallet-bar-netlist {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .wallet-bar-net {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .wallet-bar-net-name {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .wallet-bar-assets {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .wallet-bar-assets li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 0.75rem;
    color: var(--text-primary);
    font-family: ui-monospace, monospace;
  }

  .wallet-bar-asset-sym {
    color: var(--text-secondary);
    font-family: inherit;
    font-weight: 500;
  }

  .wallet-bar-placeholder {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .wallet-bar-actions {
    padding: 12px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
    border-top: 1px solid var(--bg-elevated);
  }

  .wallet-bar-btn {
    width: 100%;
    padding: 10px 14px;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  .wallet-bar-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .wallet-bar-btn-primary {
    background-color: var(--accent);
    color: #fff;
  }

  .wallet-bar-btn-secondary {
    background-color: var(--border);
    color: var(--text-primary);
  }

  .wallet-bar-btn-dev {
    background: transparent;
    color: var(--text-muted);
    border: 1px dashed var(--border);
    font-size: 0.75rem;
    padding: 8px 10px;
  }

  .wallet-bar-btn-dev:hover {
    color: var(--text-secondary);
    border-color: var(--text-muted);
  }
</style>
