<script lang="ts">
  import { currentUser } from '../../stores/auth';
  import { activeView } from '../../stores/app';
  import { theme, setTheme, THEME_OPTIONS } from '../../stores/theme';
  import SettingsPage from '../settings/SettingsPage.svelte';
  import ProfileSection from '../settings/ProfileSection.svelte';
  import NostrSettingsSection from '../settings/NostrSettingsSection.svelte';
  import WalletView from '../wallet/WalletView.svelte';
  import SettingsCollapsibleSection from '../settings/SettingsCollapsibleSection.svelte';

  function goBack() {
    $activeView = 'hub';
  }

  $: userNpub = $currentUser?.npub || '';
</script>

<div class="profile-view">
  <SettingsPage onBack={goBack}>
    <ProfileSection />

    {#if userNpub}
      <NostrSettingsSection />

      <SettingsCollapsibleSection
        sectionId="settings-evm"
        title="EVM settings"
        sectionClass="settings-section--evm"
      >
        <WalletView embeddedInSettings />
      </SettingsCollapsibleSection>

      <SettingsCollapsibleSection sectionId="settings-app" title="App settings">
        <div class="theme-section" aria-labelledby="theme-heading">
          <h3 id="theme-heading" class="theme-subheading">Appearance</h3>
          <span class="theme-label">Theme</span>
          <div class="theme-options" role="radiogroup" aria-label="App theme">
            {#each THEME_OPTIONS as opt (opt.value)}
              <label class="theme-option">
                <input
                  type="radio"
                  name="theme"
                  value={opt.value}
                  checked={$theme === opt.value}
                  on:change={() => setTheme(opt.value)}
                />
                <span class="theme-option-label">{opt.label}</span>
              </label>
            {/each}
          </div>
        </div>
      </SettingsCollapsibleSection>
    {/if}
  </SettingsPage>
</div>

<style>
  .profile-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
    height: 100%;
    min-height: 0;
    overflow: hidden;
    border-left: 1px solid var(--border-subtle);
  }

  .theme-section {
    margin: 0;
  }

  .theme-subheading {
    color: var(--text-primary);
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 8px 0;
  }

  .theme-label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-bottom: 8px;
  }

  .theme-options {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .theme-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: var(--text-primary);
    font-size: 0.9375rem;
  }

  .theme-option input {
    accent-color: var(--accent);
  }

  .theme-option-label {
    user-select: none;
  }
</style>
