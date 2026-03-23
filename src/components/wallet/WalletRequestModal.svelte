<script lang="ts">
  import WalletTransferStubModal from './WalletTransferStubModal.svelte';

  export let npub: string;
  export let peerDisplayName: string;
  export let onClose: () => void;
  export let postDmPlaintext: ((content: string) => Promise<boolean>) | undefined = undefined;
</script>

<WalletTransferStubModal mode="request" {npub} {peerDisplayName} {onClose} {postDmPlaintext} />
