<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import { showToast } from '../../stores/toast';
  import { publishCommonsBroadcast } from '../../lib/api/commons';
  import { normalizeCommonsTag } from '../../lib/commons/tags';
  import type { CommonsBroadcastAudience } from '../../lib/commons/types';
  import { getInvokeErrorMessage } from '../../lib/utils/tauri-errors';

  export let onClose: () => void;

  type DurationHours = 24 | 48 | 72;

  let tagInput = '';
  let tags: string[] = [];
  let tagError = '';
  let message = '';
  let durationHours: DurationHours = 24;
  let audienceNewUser = true;
  let audienceActiveUser = false;
  let submitError = '';
  let publishing = false;

  function addTag() {
    tagError = '';
    const t = normalizeCommonsTag(tagInput);
    if (!t) {
      tagError = 'Use lowercase letters, numbers, or underscores (max 32).';
      return;
    }
    if (tags.includes(t)) {
      tagInput = '';
      return;
    }
    if (tags.length >= 3) {
      tagError = 'At most three tags.';
      return;
    }
    tags = [...tags, t];
    tagInput = '';
  }

  function removeTag(tag: string) {
    tags = tags.filter((t) => t !== tag);
    tagError = '';
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }

  $: canSubmit =
    message.trim().length > 0 &&
    tags.length >= 1 &&
    (audienceNewUser || audienceActiveUser);

  function resolveAudience(): CommonsBroadcastAudience | null {
    if (audienceNewUser && !audienceActiveUser) return 'new_user';
    if (audienceActiveUser && !audienceNewUser) return 'active_user';
    return null;
  }

  async function handleSubmit() {
    submitError = '';
    if (!canSubmit || publishing) {
      submitError = 'Add a message, at least one tag, and select an audience.';
      return;
    }
    publishing = true;
    try {
      await publishCommonsBroadcast({
        subject: 'user',
        message: message.trim(),
        durationHours,
        tags,
        audience: resolveAudience(),
      });
      showToast('Broadcast published to Commons.');
      onClose();
    } catch (e: unknown) {
      submitError = getInvokeErrorMessage(e, 'Failed to publish broadcast.');
    } finally {
      publishing = false;
    }
  }
</script>

<Modal
  titleId="personal-broadcast-title"
  descriptionId="personal-broadcast-description"
  onClose={onClose}
  dismissible={!publishing}
>
  <h2 id="personal-broadcast-title">Personal broadcast</h2>
  <p id="personal-broadcast-description" class="broadcast-modal-lead">
    Share a public message in Commons so others can find you by tag.
  </p>
  <form on:submit|preventDefault={handleSubmit}>
    <span class="broadcast-label">Tags (1–3)</span>
    <div class="broadcast-tags-row">
      <input
        id="personal-broadcast-tag"
        type="text"
        class="broadcast-input"
        placeholder="#neo"
        bind:value={tagInput}
        on:keydown={handleTagKeydown}
        disabled={tags.length >= 3}
      />
      <button type="button" class="broadcast-btn-secondary" on:click={addTag} disabled={tags.length >= 3}>
        Add
      </button>
    </div>
    {#if tags.length > 0}
      <ul class="broadcast-tag-list" role="list">
        {#each tags as tag (tag)}
          <li>
            <span class="broadcast-tag-chip">#{tag}</span>
            <button type="button" class="broadcast-tag-remove" aria-label="Remove tag {tag}" on:click={() => removeTag(tag)}>
              ×
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if tagError}
      <p class="broadcast-error" role="alert">{tagError}</p>
    {/if}

    <fieldset class="broadcast-fieldset">
      <legend class="broadcast-label">Show as</legend>
      <label class="broadcast-check-row">
        <input type="checkbox" bind:checked={audienceNewUser} />
        <span>New user</span>
      </label>
      <label class="broadcast-check-row">
        <input type="checkbox" bind:checked={audienceActiveUser} />
        <span>Active user</span>
      </label>
    </fieldset>

    <label class="broadcast-label" for="personal-broadcast-message">Message</label>
    <textarea
      id="personal-broadcast-message"
      class="broadcast-textarea"
      rows="4"
      placeholder="What should people know before they message you?"
      bind:value={message}
      required
    ></textarea>

    <span class="broadcast-label">Duration</span>
    <div class="broadcast-duration-row" role="radiogroup" aria-label="Broadcast duration">
      {#each [24, 48, 72] as hours (hours)}
        <label class="broadcast-duration-option">
          <input type="radio" name="duration" value={hours} bind:group={durationHours} />
          <span>{hours} h</span>
        </label>
      {/each}
    </div>

    {#if submitError}
      <p class="broadcast-error" role="alert">{submitError}</p>
    {/if}

    <div class="broadcast-actions">
      <button type="button" class="broadcast-btn-cancel" on:click={onClose} disabled={publishing}>Cancel</button>
      <button type="submit" class="broadcast-btn-submit" disabled={!canSubmit || publishing}>
        {publishing ? 'Publishing…' : 'Broadcast'}
      </button>
    </div>
  </form>
</Modal>

<style>
  .broadcast-modal-lead {
    color: var(--text-muted);
    font-size: 0.9375rem;
    margin: 0 0 20px;
    line-height: 1.45;
  }

  .broadcast-label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .broadcast-input,
  .broadcast-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 0.9375rem;
    margin-bottom: 12px;
  }

  .broadcast-textarea {
    resize: vertical;
    min-height: 96px;
  }

  .broadcast-tags-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .broadcast-tags-row .broadcast-input {
    margin-bottom: 0;
    flex: 1;
  }

  .broadcast-tag-list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .broadcast-tag-list li {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .broadcast-tag-chip {
    font-size: 0.8125rem;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--bg-panel);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  .broadcast-tag-remove {
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 0 2px;
  }

  .broadcast-fieldset {
    border: none;
    margin: 0 0 12px;
    padding: 0;
  }

  .broadcast-check-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9375rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    cursor: pointer;
  }

  .broadcast-duration-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .broadcast-duration-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .broadcast-duration-option:has(input:checked) {
    border-color: var(--accent);
    color: var(--text-primary);
    background: var(--bg-panel);
  }

  .broadcast-error {
    color: var(--danger, #e55);
    font-size: 0.8125rem;
    margin: 0 0 12px;
  }

  .broadcast-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
  }

  .broadcast-btn-cancel,
  .broadcast-btn-secondary,
  .broadcast-btn-submit {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .broadcast-btn-cancel {
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  .broadcast-btn-secondary {
    background: var(--bg-panel);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .broadcast-btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .broadcast-btn-submit {
    background: var(--accent);
    border: none;
    color: var(--accent-contrast, #fff);
  }

  .broadcast-btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
