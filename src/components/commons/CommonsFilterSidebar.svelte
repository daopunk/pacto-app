<script lang="ts">
  import { normalizeCommonsTag } from '../../lib/commons/tags';
  import type {
    CommonsAudienceFilter,
    CommonsSubjectFilter,
    CommonsTagMatchMode,
  } from '../../lib/commons/commons-feed';

  export let tags: string[] = [];
  export let tagMatchMode: CommonsTagMatchMode = 'any';
  export let subjectFilter: CommonsSubjectFilter = 'both';
  export let audienceFilter: CommonsAudienceFilter = 'any';

  let tagInput = '';
  let tagError = '';

  function addTag() {
    tagError = '';
    const t = normalizeCommonsTag(tagInput);
    if (!t) {
      tagError = 'Use lowercase letters, numbers, or underscores.';
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

  $: showAudienceFilter = subjectFilter === 'both' || subjectFilter === 'users';
</script>

<aside class="commons-filter-sidebar" aria-label="Commons filters">
  <h2 class="commons-filter-heading">Discover</h2>

  <span class="commons-filter-label">Tags</span>
  <div class="commons-tags-row">
    <input
      type="text"
      class="commons-tag-input"
      placeholder="#neo"
      bind:value={tagInput}
      on:keydown={handleTagKeydown}
      disabled={tags.length >= 3}
    />
    <button type="button" class="commons-tag-add" on:click={addTag} disabled={tags.length >= 3}>Add</button>
  </div>
  {#if tags.length > 0}
    <ul class="commons-tag-list" role="list">
      {#each tags as tag (tag)}
        <li>
          <span class="commons-tag-chip">#{tag}</span>
          <button type="button" class="commons-tag-remove" aria-label="Remove tag {tag}" on:click={() => removeTag(tag)}>
            ×
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  {#if tagError}
    <p class="commons-filter-error" role="alert">{tagError}</p>
  {/if}

  <span class="commons-filter-label">Match tags</span>
  <div class="commons-toggle-row" role="radiogroup" aria-label="Tag match mode">
    <label class="commons-toggle-option">
      <input type="radio" name="tag-match" value="any" bind:group={tagMatchMode} />
      <span>Any</span>
    </label>
    <label class="commons-toggle-option">
      <input type="radio" name="tag-match" value="all" bind:group={tagMatchMode} />
      <span>All</span>
    </label>
  </div>

  <span class="commons-filter-label">Show</span>
  <div class="commons-toggle-col" role="radiogroup" aria-label="Subject filter">
    <label class="commons-radio-row">
      <input type="radio" name="subject-filter" value="both" bind:group={subjectFilter} />
      <span>Squads and users</span>
    </label>
    <label class="commons-radio-row">
      <input type="radio" name="subject-filter" value="squads" bind:group={subjectFilter} />
      <span>Squads only</span>
    </label>
    <label class="commons-radio-row">
      <input type="radio" name="subject-filter" value="users" bind:group={subjectFilter} />
      <span>Users only</span>
    </label>
  </div>

  {#if showAudienceFilter}
    <span class="commons-filter-label">User audience</span>
    <div class="commons-toggle-col" role="radiogroup" aria-label="Audience filter">
      <label class="commons-radio-row">
        <input type="radio" name="audience-filter" value="any" bind:group={audienceFilter} />
        <span>Any</span>
      </label>
      <label class="commons-radio-row">
        <input type="radio" name="audience-filter" value="new_user" bind:group={audienceFilter} />
        <span>New user</span>
      </label>
      <label class="commons-radio-row">
        <input type="radio" name="audience-filter" value="active_user" bind:group={audienceFilter} />
        <span>Active user</span>
      </label>
    </div>
  {/if}
</aside>

<style>
  .commons-filter-sidebar {
    width: 220px;
    min-width: 220px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-subtle);
    background: var(--bg-panel);
    padding: 16px 14px;
    box-sizing: border-box;
    overflow-y: auto;
  }

  .commons-filter-heading {
    margin: 0 0 14px;
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .commons-filter-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0 0 6px;
  }

  .commons-filter-label:not(:first-of-type) {
    margin-top: 14px;
  }

  .commons-tags-row {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .commons-tag-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 0.8125rem;
  }

  .commons-tag-add {
    flex-shrink: 0;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .commons-tag-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .commons-tag-list {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .commons-tag-list li {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .commons-tag-chip {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }

  .commons-tag-remove {
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9375rem;
    line-height: 1;
    padding: 0 2px;
  }

  .commons-filter-error {
    margin: 0 0 8px;
    font-size: 0.75rem;
    color: var(--danger, #e55);
  }

  .commons-toggle-row {
    display: flex;
    gap: 6px;
  }

  .commons-toggle-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .commons-toggle-option:has(input:checked) {
    border-color: var(--accent);
    color: var(--text-primary);
    background: var(--bg-elevated);
  }

  .commons-toggle-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .commons-radio-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8125rem;
    color: var(--text-secondary);
    cursor: pointer;
  }
</style>
