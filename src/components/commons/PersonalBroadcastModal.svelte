<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import UserCommonsBroadcastPanel from './UserCommonsBroadcastPanel.svelte';
  import { commonsUserPrefs } from '../../stores/commons-prefs';
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
  {#if $commonsUserPrefs.visibility !== 'public'}
    <p class="broadcast-private-note" role="status">
      Set Commons visibility to <strong>Public</strong> under Settings → Commons before broadcasting.
    </p>
    <div class="broadcast-actions">
      <button type="button" class="broadcast-btn-cancel" on:click={onClose}>Close</button>
    </div>
  {:else if userNpub}
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

  .broadcast-actions {
    display: flex;
    justify-content: flex-end;
  }

  .broadcast-btn-cancel {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }
</style>
