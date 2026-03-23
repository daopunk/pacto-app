<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import type { SupportedChainId } from '../../lib/wallet/chains';
  import { DEFAULT_CHAIN_ID } from '../../lib/wallet/chains';
  import {
    WALLET_ASSETS_CHAIN_IDS,
    listWalletAssetOptionsForChain,
    getWalletNetworkDisplayName,
    getExplorerTxUrl,
    type WalletAssetCode,
  } from '../../lib/wallet/assets';
  import {
    getWalletUsdSpotPrices,
    amountToApproxUsd,
    formatApproxUsd,
    type WalletUsdSpotPrices,
  } from '../../lib/wallet/pricing';
  import {
    walletBuildAndSendTransaction,
    type WalletTransferSuccessDetail,
  } from '../../lib/wallet/backend-wallet';
  import { showToast } from '../../stores/toast';
  import type { WalletSendPrefillPayload } from '../../stores/app';
  import { formatWalletTxRequest } from '../../lib/wallet/dm-messages';

  export let mode: 'send' | 'request';
  export let npub: string;
  export let peerDisplayName: string;
  export let onClose: () => void;
  /** Request mode: post JSON DM (`wallet_tx_request`). Same path as normal DM send. */
  export let postDmPlaintext: ((content: string) => Promise<boolean>) | undefined = undefined;
  /** Send mode: from Accept on a `wallet_tx_request` (applied once per open). */
  export let formPrefill: WalletSendPrefillPayload | null = null;
  /** Send mode: invoked after on-chain success, before success toast and close. */
  export let onTransferSuccess: ((detail: WalletTransferSuccessDetail) => void | Promise<void>) | undefined =
    undefined;

  function truncateNpub(n: string): string {
    if (n.length <= 20) return n;
    return n.slice(0, 10) + '…' + n.slice(-6);
  }

  const titleId = `wallet-${mode}-title`;
  const descId = `wallet-${mode}-desc`;

  let chainId: SupportedChainId = DEFAULT_CHAIN_ID;
  let assetCode: WalletAssetCode = 'ETH';
  let amountStr = '';

  let appliedPrefillKey = '';
  let linkedRequestId = '';

  $: prefillKey =
    mode === 'send' && formPrefill
      ? `${formPrefill.requestMessageId}:${formPrefill.requestId}`
      : '';

  $: if (mode === 'send' && formPrefill && prefillKey !== appliedPrefillKey) {
    appliedPrefillKey = prefillKey;
    chainId = formPrefill.network;
    assetCode = formPrefill.asset;
    amountStr = formPrefill.amount;
    linkedRequestId = formPrefill.requestId;
  }

  $: if (mode === 'send' && !formPrefill) {
    appliedPrefillKey = '';
    linkedRequestId = '';
  }

  let pricesResult:
    | { ok: true; prices: WalletUsdSpotPrices }
    | { ok: false; message: string }
    | null = null;

  onMount(() => {
    let cancelled = false;
    getWalletUsdSpotPrices().then((r) => {
      if (!cancelled) pricesResult = r;
    });
    return () => {
      cancelled = true;
    };
  });

  $: assetOptions = listWalletAssetOptionsForChain(chainId);

  function syncAssetToChain() {
    const codes = listWalletAssetOptionsForChain(chainId).map((o) => o.code);
    if (!codes.includes(assetCode)) assetCode = 'ETH';
  }

  function parsePositiveAmount(s: string): number | null {
    const t = s.trim();
    if (!t) return null;
    const n = Number.parseFloat(t.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  $: amountValid = parsePositiveAmount(amountStr) !== null;
  let sending = false;
  let sendError: { message: string; txHash?: string } | null = null;

  $: canConfirm = amountValid && !sending;
  $: explorerLinkForError =
    sendError?.txHash != null && sendError.txHash.length > 0
      ? getExplorerTxUrl(chainId, sendError.txHash)
      : null;

  $: approxUsd =
    pricesResult?.ok === true && amountValid
      ? amountToApproxUsd(amountStr, assetCode, pricesResult.prices)
      : null;

  $: usdLine =
    pricesResult === null
      ? 'Loading USD rates…'
      : !pricesResult.ok
        ? pricesResult.message
        : approxUsd != null
          ? `≈ ${formatApproxUsd(approxUsd)}`
          : 'Enter an amount to see USD estimate.';

  async function handleConfirm() {
    if (!amountValid || sending) return;
    if (mode === 'request') {
      const postDm = postDmPlaintext;
      if (!postDm) {
        showToast('Payment requests can only be sent from the desktop app in an open DM.');
        return;
      }
      sendError = null;
      sending = true;
      try {
        const content = formatWalletTxRequest({
          request_id: crypto.randomUUID(),
          network: chainId,
          asset: assetCode,
          amount: amountStr.trim(),
          created_at_ms: Date.now(),
        });
        const ok = await postDm(content);
        if (ok) {
          showToast('Payment request sent in this chat.');
          onClose();
        } else {
          const msg = 'Could not deliver the request. Check your connection and try again.';
          sendError = { message: msg };
          showToast(msg);
        }
      } catch {
        const msg = 'Could not send the payment request.';
        sendError = { message: msg };
        showToast(msg);
      } finally {
        sending = false;
      }
      return;
    }
    sendError = null;
    sending = true;
    try {
      const out = await walletBuildAndSendTransaction(npub, chainId, assetCode, amountStr.trim());
      if (out.ok) {
        if (onTransferSuccess) {
          await onTransferSuccess({
            result: out.result,
            network: chainId,
            asset: assetCode,
            amount: amountStr.trim(),
            ...(linkedRequestId !== '' ? { requestId: linkedRequestId } : {}),
          });
        }
        const h = out.result.txHash;
        const short = h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;
        showToast(`Confirmed on ${out.result.network}. Tx ${short}`);
        onClose();
      } else {
        sendError = {
          message: out.message,
          txHash: out.parsed?.txHash,
        };
        showToast(out.parsed?.code === 'RECEIPT_TIMEOUT' ? 'Confirmation timed out' : out.message);
      }
    } finally {
      sending = false;
    }
  }
</script>

<Modal {titleId} descriptionId={descId} {onClose} dismissible={!sending}>
  <h2 id={titleId}>{mode === 'send' ? 'Send' : 'Request payment'}</h2>
  <p id={descId} class="wallet-stub-desc">
    {mode === 'send'
      ? `Send assets to ${peerDisplayName} from your embedded wallet (desktop app). Confirm signs and broadcasts the transaction, then waits for on-chain confirmation before closing. Your contact must have an EVM address on their profile.`
      : `Request a payment from ${peerDisplayName}. Confirm posts a payment request card in this chat (desktop app). They can accept to open Send with your amount pre-filled.`}
    <span class="wallet-stub-npub-ref">{truncateNpub(npub)}</span>
  </p>

  <div class="wallet-stub-fields">
    <label class="wallet-stub-label">
      <span class="wallet-stub-label-text">Network</span>
      <select
        class="wallet-stub-select"
        bind:value={chainId}
        aria-label="Network"
        disabled={sending}
        on:change={syncAssetToChain}
      >
        {#each WALLET_ASSETS_CHAIN_IDS as cid (cid)}
          <option value={cid}>{getWalletNetworkDisplayName(cid)}</option>
        {/each}
      </select>
    </label>

    <label class="wallet-stub-label">
      <span class="wallet-stub-label-text">Asset</span>
      <select class="wallet-stub-select" bind:value={assetCode} aria-label="Asset" disabled={sending}>
        {#each assetOptions as opt (opt.code)}
          <option value={opt.code}>{opt.code}</option>
        {/each}
      </select>
    </label>

    <label class="wallet-stub-label">
      <span class="wallet-stub-label-text">Amount</span>
      <input
        class="wallet-stub-input"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0.0"
        bind:value={amountStr}
        disabled={sending}
        aria-invalid={amountStr.trim() !== '' && !amountValid}
        aria-label="Amount"
      />
    </label>

    <p class="wallet-stub-usd" role="status">{usdLine}</p>

    {#if sending}
      <p class="wallet-stub-wait" role="status" aria-live="polite">
        Waiting for on-chain confirmation. This can take up to a few minutes on busy networks.
      </p>
    {/if}

    {#if sendError}
      <div class="wallet-stub-error" role="alert">
        <p class="wallet-stub-error-msg">{sendError.message}</p>
        {#if explorerLinkForError}
          <a
            class="wallet-stub-error-link"
            href={explorerLinkForError}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on block explorer
          </a>
        {:else if sendError.txHash}
          <p class="wallet-stub-error-hash"><code>{sendError.txHash}</code></p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="wallet-stub-actions">
    <button
      type="button"
      class="wallet-stub-btn wallet-stub-btn-secondary"
      disabled={sending}
      on:click={onClose}>Cancel</button>
    <button type="button" class="wallet-stub-btn wallet-stub-btn-primary" disabled={!canConfirm} on:click={handleConfirm}>
      {sending
        ? mode === 'send'
          ? 'Waiting for confirmation…'
          : 'Sending…'
        : 'Confirm'}
    </button>
  </div>
</Modal>

<style>
  .wallet-stub-desc {
    margin: 0 0 20px;
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  .wallet-stub-npub-ref {
    display: block;
    margin-top: 8px;
    font-size: 0.75rem;
    font-family: ui-monospace, monospace;
    color: var(--text-muted);
    word-break: break-all;
  }

  .wallet-stub-fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 24px;
  }

  .wallet-stub-label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
  }

  .wallet-stub-label-text {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--text-muted);
  }

  .wallet-stub-select,
  .wallet-stub-input {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-primary);
    font-size: 0.9375rem;
    font-family: inherit;
    box-sizing: border-box;
    width: 100%;
  }

  .wallet-stub-input:focus,
  .wallet-stub-select:focus {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .wallet-stub-usd {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-muted);
    line-height: 1.4;
    min-height: 1.2em;
  }

  .wallet-stub-wait {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    line-height: 1.45;
  }

  .wallet-stub-error {
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: rgba(220, 53, 69, 0.08);
  }

  .wallet-stub-error-msg {
    margin: 0 0 8px;
    font-size: 0.875rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .wallet-stub-error-msg:last-child {
    margin-bottom: 0;
  }

  .wallet-stub-error-link {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--accent);
    text-decoration: underline;
  }

  .wallet-stub-error-hash {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    word-break: break-all;
  }

  .wallet-stub-error-hash code {
    font-family: ui-monospace, monospace;
  }

  .wallet-stub-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
  }

  .wallet-stub-btn {
    padding: 10px 18px;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  .wallet-stub-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .wallet-stub-btn-secondary {
    background: var(--border);
    color: var(--text-primary);
  }

  .wallet-stub-btn-primary {
    background: var(--accent);
    color: #fff;
  }
</style>
