<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import UserCommonsBroadcastPanel from './UserCommonsBroadcastPanel.svelte';
  import { currentUser } from '../../stores/auth';

  export let onClose: () => void;

  $: userNpub = $currentUser?.npub ?? '';
</script>

<Modal
  titleId="personal-broadcast-title"
  descriptionId="personal-broadcast-description"
  onClose={onClose}
>
  <h2 id="personal-broadcast-title">Personal broadcast</h2>
  <p id="personal-broadcast-description" class="broadcast-modal-lead">
    Share a public message in Commons so others can find you by tag.
  </p>
  {#if userNpub}
    <UserCommonsBroadcastPanel {userNpub} onPublished={onClose} />
  {:else}
    <p class="broadcast-private-note">Log in to publish a broadcast.</p>
  {/if}
</Modal>

<style>
  .broadcast-modal-lead {
    color: var(--text-muted);
    font-size: 0.9375rem;
    margin: 0 0 20px;
    line-height: 1.45;
  }

  .broadcast-private-note {
    color: var(--text-secondary);
    font-size: 0.9375rem;
    margin: 0 0 16px;
    line-height: 1.45;
  }
</style>
