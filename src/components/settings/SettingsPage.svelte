<script lang="ts">
  import { onMount } from 'svelte';
  import backIcon from '../../icons/chevron-double-left.svg';

  export let onBack: () => void;

  const SECTION_LINKS = [
    { id: 'settings-profile', label: 'Profile' },
    { id: 'settings-nostr', label: 'Nostr' },
    { id: 'settings-evm', label: 'EVM' },
    { id: 'settings-app', label: 'App' },
  ] as const;

  let activeSectionId: (typeof SECTION_LINKS)[number]['id'] = SECTION_LINKS[0].id;

  onMount(() => {
    const sections = SECTION_LINKS.map((link) => document.getElementById(link.id)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top && SECTION_LINKS.some((link) => link.id === top)) {
          activeSectionId = top as (typeof SECTION_LINKS)[number]['id'];
        }
      },
      { rootMargin: '-12% 0px -55% 0px', threshold: [0, 0.1, 0.35, 0.6, 1] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  });
</script>

<div class="settings-page">
  <header class="settings-page-header">
    <button type="button" class="settings-back" on:click={onBack} aria-label="Back to DMs or Squads">
      <img src={backIcon} alt="" class="settings-back-icon" />
      <span>Back</span>
    </button>
    <h1 class="settings-page-title">Settings</h1>
  </header>

  <div class="settings-body">
    <nav class="settings-sidebar" aria-label="Settings sections">
      <ul class="settings-sidebar-list">
        {#each SECTION_LINKS as link (link.id)}
          <li>
            <a
              class="settings-sidebar-link"
              class:active={activeSectionId === link.id}
              href={`#${link.id}`}
              aria-current={activeSectionId === link.id ? 'location' : undefined}
            >
              {link.label}
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="settings-main">
      <div class="settings-sections">
        <slot />
      </div>
    </div>
  </div>
</div>

<style>
  .settings-page {
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .settings-page-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 24px 20px;
    min-width: 0;
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }

  .settings-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    outline: none;
  }

  .settings-back:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .settings-back:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .settings-back-icon {
    width: 18px;
    height: 18px;
    display: block;
    filter: var(--icon-dropdown-filter);
  }

  .settings-page-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 0;
  }

  .settings-body {
    display: flex;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  .settings-sidebar {
    position: sticky;
    top: 0;
    align-self: flex-start;
    width: 200px;
    flex-shrink: 0;
    padding: 20px 12px 32px 16px;
    border-right: 1px solid var(--border-subtle);
    box-sizing: border-box;
  }

  .settings-sidebar-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .settings-sidebar-link {
    display: block;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    outline: none;
    transition: background-color 0.15s, color 0.15s;
  }

  .settings-sidebar-link:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .settings-sidebar-link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .settings-sidebar-link.active {
    background: var(--bg-elevated);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-subtle);
  }

  .settings-main {
    flex: 1;
    min-width: 0;
    padding: 24px 32px 64px;
    box-sizing: border-box;
  }

  .settings-sections {
    display: flex;
    flex-direction: column;
    gap: 48px;
    width: 100%;
  }

  :global(.settings-section:not(.settings-section--evm)) {
    max-width: 720px;
  }

  :global(.settings-section) {
    scroll-margin-top: 24px;
  }

  :global(.settings-section-title) {
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  :global(.settings-section-stub) {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9375rem;
    line-height: 1.5;
  }

  :global(.settings-section--evm) {
    max-width: none;
    width: 100%;
  }

  :global(.settings-section--evm .wallet-view) {
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    overflow: hidden;
  }
</style>
