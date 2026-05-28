<script lang="ts">
  import SettingsCollapsibleSection from './SettingsCollapsibleSection.svelte';
  import UserCommonsBroadcastPanel from '../commons/UserCommonsBroadcastPanel.svelte';
  import {
    commonsUserPrefs,
    setCommonsUserVisibility,
    type CommonsUserVisibility,
  } from '../../stores/commons-prefs';

  export let userNpub = '';
</script>

<SettingsCollapsibleSection sectionId="settings-commons" title="Commons">
  <p class="commons-lead">
    Control whether you can publish user broadcasts in Commons. This is independent of your Nostr
    profile visibility.
  </p>

  <fieldset class="commons-visibility-fieldset">
    <legend class="commons-visibility-legend">Commons visibility</legend>
    <label class="commons-visibility-option">
      <input
        type="radio"
        name="commons-user-visibility"
        value="private"
        checked={$commonsUserPrefs.visibility === 'private'}
        on:change={() => setCommonsUserVisibility('private')}
      />
      <span>Private</span>
    </label>
    <label class="commons-visibility-option">
      <input
        type="radio"
        name="commons-user-visibility"
        value="public"
        checked={$commonsUserPrefs.visibility === 'public'}
        on:change={() => setCommonsUserVisibility('public')}
      />
      <span>Public</span>
    </label>
  </fieldset>

  {#if $commonsUserPrefs.visibility === 'public'}
    {#if userNpub}
      <UserCommonsBroadcastPanel {userNpub} />
    {:else}
      <p class="commons-muted">Log in to publish a user broadcast.</p>
    {/if}
  {:else}
    <p class="commons-muted">Set visibility to Public to broadcast in Commons.</p>
  {/if}
</SettingsCollapsibleSection>

<style>
  .commons-lead {
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.45;
    margin: 0 0 16px;
  }

  .commons-visibility-fieldset {
    border: none;
    margin: 0 0 20px;
    padding: 0;
  }

  .commons-visibility-legend {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8125rem;
    font-weight: 500;
    margin-bottom: 8px;
    padding: 0;
  }

  .commons-visibility-option {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9375rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    cursor: pointer;
  }

  .commons-muted {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin: 0;
  }
</style>
