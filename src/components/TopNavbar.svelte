<script lang="ts">
  import { activeTopNavTab, type TopNavTab } from '../stores/app';

  const tabs: { id: TopNavTab; label: string }[] = [
    { id: 'dms', label: 'DMs' }, // 1-on-1 chat, non-governable
    { id: 'squads', label: 'Squads' }, // commune-level organizations (positioned below networks), governable
    { id: 'networks', label: 'Networks' }, // [regional] delegation-level coordinations (positioned above squads), governable
  ];

  function selectTab(id: TopNavTab) {
    $activeTopNavTab = id;
  }
</script>

<div class="top-navbar" role="tablist" aria-label="Main navigation">
  {#each tabs as tab}
    <button
      type="button"
      role="tab"
      class="tab"
      class:active={$activeTopNavTab === tab.id}
      on:click={() => selectTab(tab.id)}
      aria-selected={$activeTopNavTab === tab.id}
      aria-label={tab.label}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .top-navbar {
    height: 40px;
    min-height: 40px;
    width: 100%;
    background-color: var(--bg-elevated);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--text-secondary);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s, border-color 0.15s;
    outline: none;
  }

  .tab:hover {
    color: var(--text-primary);
    background-color: rgba(255, 255, 255, 0.04);
  }

  .tab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--accent);
    background-color: rgba(255, 255, 255, 0.02);
  }
</style>
