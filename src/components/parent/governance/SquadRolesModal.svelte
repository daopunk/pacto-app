<script lang="ts">
  import Modal from '../../ui/Modal.svelte';

  export let open = false;
  export let onClose: () => void;

  const titleId = 'squad-roles-modal-title';
  const descId = 'squad-roles-modal-desc';
</script>

{#if open}
  <Modal {titleId} descriptionId={descId} {onClose} contentClass="squad-roles-modal-panel">
    <h2 id={titleId}>Squad Admin roles</h2>
    <p id={descId} class="squad-roles-modal-desc">
      Create and assign on-chain executor roles through Squad Admin when that deploy path is live.
      Until then, view member Hats and Roles in the roster below.
    </p>
    <p class="squad-roles-modal-note muted">
      Full create/assign flows ship with Squad Admin deploy (execution step 11).
    </p>
    <div class="squad-roles-modal-actions">
      <button type="button" class="btn-primary" on:click={onClose}>Close</button>
    </div>
  </Modal>
{/if}

<style>
  :global(.squad-roles-modal-panel) {
    max-width: 420px;
  }

  .squad-roles-modal-desc,
  .squad-roles-modal-note {
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 12px 0;
  }

  .muted {
    color: var(--text-muted);
  }

  .squad-roles-modal-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }
</style>
