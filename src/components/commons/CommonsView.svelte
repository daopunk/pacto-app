<script lang="ts">
  import { onDestroy } from 'svelte';
  import CommonsFilterSidebar from './CommonsFilterSidebar.svelte';
  import CommonsBroadcastCard from './CommonsBroadcastCard.svelte';
  import { fetchCommonsBroadcasts } from '../../lib/api/commons';
  import type { CommonsBroadcastDto } from '../../lib/commons/types';
  import {
    COMMONS_FEED_REFRESH_MS,
    DEFAULT_COMMONS_FEED_FILTERS,
    prepareCommonsFeed,
    type CommonsAudienceFilter,
    type CommonsSubjectFilter,
    type CommonsTagMatchMode,
  } from '../../lib/commons/commons-feed';
  import { getInvokeErrorMessage } from '../../lib/utils/tauri-errors';
  import { activeTopNavTab } from '../../stores/navigation';

  let broadcasts: CommonsBroadcastDto[] = [];
  let loading = true;
  let error: string | null = null;
  let filterTags: string[] = [...DEFAULT_COMMONS_FEED_FILTERS.tags];
  let tagMatchMode: CommonsTagMatchMode = DEFAULT_COMMONS_FEED_FILTERS.tagMatchMode;
  let subjectFilter: CommonsSubjectFilter = DEFAULT_COMMONS_FEED_FILTERS.subjectFilter;
  let audienceFilter: CommonsAudienceFilter = DEFAULT_COMMONS_FEED_FILTERS.audienceFilter;

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let wasCommonsActive = false;

  $: feedFilters = { tags: filterTags, tagMatchMode, subjectFilter, audienceFilter };
  $: filteredBroadcasts = prepareCommonsFeed(broadcasts, feedFilters);
  $: hasFilters =
    filterTags.length > 0 ||
    subjectFilter !== 'both' ||
    audienceFilter !== 'any';
  $: emptyBecauseFilters = !loading && !error && broadcasts.length > 0 && filteredBroadcasts.length === 0;

  async function loadFeed(options: { silent?: boolean } = {}) {
    if (!options.silent) {
      loading = true;
    }
    error = null;
    try {
      broadcasts = await fetchCommonsBroadcasts(100);
    } catch (e: unknown) {
      error = getInvokeErrorMessage(e, 'Could not load Commons broadcasts.');
      if (!options.silent) {
        broadcasts = [];
      }
    } finally {
      if (!options.silent) {
        loading = false;
      }
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = setInterval(() => {
      void loadFeed({ silent: true });
    }, COMMONS_FEED_REFRESH_MS);
  }

  $: {
    const commonsActive = $activeTopNavTab === 'commons';
    if (commonsActive && !wasCommonsActive) {
      void loadFeed();
      startPolling();
    } else if (!commonsActive && wasCommonsActive) {
      stopPolling();
    }
    wasCommonsActive = commonsActive;
  }

  onDestroy(() => {
    stopPolling();
  });
</script>

<div class="commons-area">
  <CommonsFilterSidebar
    bind:tags={filterTags}
    bind:tagMatchMode
    bind:subjectFilter
    bind:audienceFilter
  />
  <section class="commons-main" aria-labelledby="commons-feed-heading">
    <header class="commons-main-header">
      <div class="commons-main-header-row">
        <div>
          <h1 id="commons-feed-heading" class="commons-main-title">Commons</h1>
          <p class="commons-main-lead muted">
            Active public broadcasts from the last 72 hours. Newest first.
          </p>
        </div>
        <button type="button" class="commons-refresh-btn" disabled={loading} on:click={() => loadFeed()}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
    <div class="commons-feed" role="feed" aria-busy={loading}>
      {#if error}
        <p class="commons-feed-error" role="alert">{error}</p>
      {:else if loading && filteredBroadcasts.length === 0}
        <p class="commons-feed-empty muted" role="status">Loading broadcasts…</p>
      {:else if emptyBecauseFilters}
        <p class="commons-feed-empty muted" role="status">No broadcasts match your filters.</p>
        <p class="commons-feed-hint muted">Try fewer tags, match Any, or broaden Show / audience.</p>
      {:else if filteredBroadcasts.length === 0}
        <p class="commons-feed-empty muted" role="status">No active broadcasts yet.</p>
        <p class="commons-feed-hint muted">
          {#if hasFilters}
            Clear filters or use + Broadcast to publish.
          {:else}
            Use + Broadcast to publish, or wait for others on relays.
          {/if}
        </p>
      {:else}
        <ul class="commons-feed-list" role="list">
          {#each filteredBroadcasts as broadcast (broadcast.eventId)}
            <li>
              <CommonsBroadcastCard {broadcast} />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </section>
</div>

<style>
  .commons-area {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: row;
  }

  .commons-main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg-base, var(--bg-primary));
  }

  .commons-main-header {
    flex-shrink: 0;
    padding: 20px 24px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .commons-main-header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .commons-main-title {
    margin: 0 0 6px;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .commons-main-lead {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    max-width: 42rem;
  }

  .commons-refresh-btn {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-panel);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .commons-refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .commons-feed {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 24px 24px;
  }

  .commons-feed-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .commons-feed-empty,
  .commons-feed-error {
    margin: 0 0 8px;
    font-size: 0.9375rem;
    text-align: center;
  }

  .commons-feed-error {
    color: var(--danger, #e55);
  }

  .commons-feed-hint {
    margin: 0;
    font-size: 0.8125rem;
    text-align: center;
    max-width: 22rem;
    margin-inline: auto;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
