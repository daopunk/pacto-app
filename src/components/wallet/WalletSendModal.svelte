<script lang="ts">
  import WalletTransferStubModal from './WalletTransferStubModal.svelte';
  import type { WalletTransferSuccessDetail } from '../../lib/wallet';
  import type { WalletSendPrefillPayload } from '../../stores/app';

  export let npub: string;
  export let peerDisplayName: string;
  export let onClose: () => void;
  /** From Accept on a payment request: network, asset, amount, request id. */
  export let formPrefill: WalletSendPrefillPayload | null = null;
  /**
   * Called after the backend confirms receipt (before toast + modal close).
   * Use to refresh balances and post the `wallet_tx_announcement` DM.
   */
  export let onTransferSuccess: ((detail: WalletTransferSuccessDetail) => void | Promise<void>) | undefined =
    undefined;
</script>

<WalletTransferStubModal
  mode="send"
  {npub}
  {peerDisplayName}
  {onClose}
  {formPrefill}
  {onTransferSuccess}
/>
