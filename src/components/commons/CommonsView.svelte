<script lang="ts">
  import { onMount } from 'svelte';
  import CommonsFilterSidebar from './CommonsFilterSidebar.svelte';
  import CommonsBroadcastCard from './CommonsBroadcastCard.svelte';
  import { fetchCommonsBroadcasts } from '../../lib/api/commons';
  import type { CommonsBroadcastDto } from '../../lib/commons/types';
  import { getInvokeErrorMessage } from '../../lib/utils/tauri-errors';

  let broadcasts: CommonsBroadcastDto[] = [];
  let loading = true;
  let error: string | null = null;

  async function loadFeed() {
    loading = true;
    error = null;
    try {
      broadcasts = await fetchCommonsBroadcasts(100);
    } catch (e: unknown) {
      error = getInvokeErrorMessage(e, 'Could not load Commons broadcasts.');
      broadcasts = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    void loadFeed();
  });
</script>

<div class="commons-area">
  <CommonsFilterSidebar />
  <section class="commons-main" aria-labelledby="commons-feed-heading">
    <header class="commons-main-header">
      <div class="commons-main-header-row">
        <div>
          <h1 id="commons-feed-heading" class="commons-main-title">Commons</h1>
          <p class="commons-main-lead muted">
            Active public broadcasts from the last 72 hours on trusted relays.
          </p>
        </div>
        <button type="button" class="commons-refresh-btn" disabled={loading} on:click={loadFeed}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
    <div class="commons-feed" role="feed" aria-busy={loading}>
      {#if error}
        <p class="commons-feed-error" role="alert">{error}</p>
      {:else if loading && broadcasts.length === 0}
        <p class="commons-feed-empty muted" role="status">Loading broadcasts…</p>
      {:else if broadcasts.length === 0}
        <p class="commons-feed-empty muted" role="status">No active broadcasts yet.</p>
        <p class="commons-feed-hint muted">Use + Broadcast to publish, or wait for others on relays.</p>
      {:else}
        <ul class="commons-feed-list" role="list">
          {#each broadcasts as broadcast (broadcast.eventId)}
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
    max-width: 20rem;
    margin-inline: auto;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
