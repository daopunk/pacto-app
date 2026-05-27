<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { currentUser } from '../../stores/auth';
  import { showToast } from '../../stores/toast';
  import {
    bindDefaultSquadSigner,
    bindNewSquadKey,
    resolveSquadRosterEvmAddress,
  } from '../../lib/squad/squad-roster-binding';

  export let open = false;
  export let parentKind: 'squad' | 'network' = 'squad';
  export let parentName: string;
  export let parentId: string;
  export let announcementsGroupId: string;
  export let onClose: () => void;

  const titleId = 'change-signer-title';
  const descId = 'change-signer-desc';

  let loading = true;
  let saving: 'default' | 'new' | null = null;
  let error = '';
  let rosterAddressForMe: string | null = null;

  async function load(): Promise<void> {
    loading = true;
    error = '';
    try {
      const me = $currentUser?.npub;
      if (me && parentId.trim()) {
        rosterAddressForMe = await resolveSquadRosterEvmAddress(parentId, me);
      } else {
        rosterAddressForMe = null;
      }
    } catch {
      error = 'Could not load roster signer.';
      rosterAddressForMe = null;
    } finally {
      loading = false;
    }
  }

  $: if (open) {
    void load();
  }

  async function confirmDefault(): Promise<void> {
    if (!parentId.trim() || !announcementsGroupId.trim()) return;
    saving = 'default';
    error = '';
    try {
      const ok = await bindDefaultSquadSigner(announcementsGroupId.trim());
      if (!ok) {
        error = 'Could not update signer.';
        return;
      }
      showToast(
        'Signer address updated for this ' +
          (parentKind === 'squad' ? 'squad' : 'network') +
          '. Existing Safes on-chain are unchanged—update owners separately if needed.'
      );
      onClose();
    } catch (e) {
      error = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Could not update signer.';
    } finally {
      saving = null;
    }
  }

  async function confirmNewKey(): Promise<void> {
    if (!parentId.trim() || !announcementsGroupId.trim()) return;
    saving = 'new';
    error = '';
    try {
      const ok = await bindNewSquadKey(announcementsGroupId.trim(), 'Squad key');
      if (!ok) {
        error = 'Could not create a new squad key.';
        return;
      }
      showToast(
        'New squad key bound for this ' +
          (parentKind === 'squad' ? 'squad' : 'network') +
          '. Your DM wallet signer is unchanged.'
      );
      onClose();
    } catch (e) {
      error = typeof e === 'string' ? e : e instanceof Error ? e.message : 'Could not update signer.';
    } finally {
      saving = null;
    }
  }
</script>

{#if open}
<Modal
  {titleId}
  descriptionId={descId}
  {onClose}
  dismissible={!saving}
  contentClass="change-signer-modal-panel"
>
  <h2 id={titleId}>Change signer</h2>
  <p id={descId} class="change-signer-desc">
    Choose how this <strong>{parentName}</strong> roster signer is bound. This updates the address
    shared in Inbox and used for deploy co-owner suggestions. <strong>Updating here does not modify an
    already deployed Safe</strong>—only the lookup for this group going forward.
  </p>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else}
    {#if rosterAddressForMe}
      <p class="muted change-signer-current">
        Current roster address: <code class="change-signer-code">{rosterAddressForMe}</code>
      </p>
    {/if}
    <div class="change-signer-actions">
      <button
        type="button"
        class="btn-primary"
        disabled={!!saving}
        on:click={() => void confirmDefault()}
      >
        {saving === 'default' ? 'Saving…' : 'Use default squad signer'}
      </button>
      <button
        type="button"
        class="btn-secondary"
        disabled={!!saving}
        on:click={() => void confirmNewKey()}
      >
        {saving === 'new' ? 'Creating…' : 'Generate new key for this squad'}
      </button>
    </div>
  {/if}

  {#if error}
    <p class="change-signer-error" role="alert">{error}</p>
  {/if}

  <div class="modal-actions">
    <button type="button" class="btn-secondary" on:click={onClose} disabled={!!saving}>Cancel</button>
  </div>
</Modal>
{/if}

<style>
  .change-signer-desc {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 16px 0;
    line-height: 1.45;
  }

  .change-signer-desc strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .change-signer-current {
    font-size: 0.8125rem;
    margin: 0 0 12px 0;
  }

  .change-signer-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 0 0 12px 0;
  }

  .change-signer-code {
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    word-break: break-all;
    color: var(--text-secondary);
  }

  .change-signer-error {
    color: var(--danger, #e85d5d);
    font-size: 0.8125rem;
    margin: 8px 0 0 0;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary {
    background: var(--accent);
    color: var(--accent-contrast, #fff);
    border: none;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, var(--accent));
  }

  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    border: 1px solid var(--border-subtle);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn-secondary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  :global(.change-signer-modal-panel) {
    max-width: 480px;
  }
</style>
