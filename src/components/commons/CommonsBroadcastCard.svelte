<script lang="ts">
  import type { CommonsBroadcastDto } from '../../lib/commons/types';

  export let broadcast: CommonsBroadcastDto;

  function formatExpiry(expiresAt: number): string {
    const ms = expiresAt * 1000 - Date.now();
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d left`;
  }

  $: label =
    broadcast.subject === 'squad'
      ? broadcast.squadName ?? 'Squad'
      : broadcast.authorNpub.slice(0, 12) + '…';
  $: subtitle =
    broadcast.subject === 'user' && broadcast.audience
      ? broadcast.audience === 'new_user'
        ? 'New user'
        : 'Active user'
      : broadcast.subject === 'squad'
        ? 'Squad'
        : 'User';
</script>

<article class="commons-card">
  <header class="commons-card-header">
    <div>
      <h3 class="commons-card-title">{label}</h3>
      <p class="commons-card-meta muted">{subtitle} · {formatExpiry(broadcast.expiresAt)}</p>
    </div>
  </header>
  {#if broadcast.tags.length > 0}
    <ul class="commons-card-tags" role="list">
      {#each broadcast.tags as tag (tag)}
        <li>#{tag}</li>
      {/each}
    </ul>
  {/if}
  <p class="commons-card-message">{broadcast.message}</p>
</article>

<style>
  .commons-card {
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 14px 16px;
    background: var(--bg-elevated);
  }

  .commons-card-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .commons-card-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .commons-card-meta {
    margin: 2px 0 0;
    font-size: 0.75rem;
  }

  .commons-card-tags {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .commons-card-tags li {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--bg-panel);
    color: var(--text-secondary);
  }

  .commons-card-message {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .muted {
    color: var(--text-muted);
  }
</style>
