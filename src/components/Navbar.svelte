<script lang="ts">
  import Tab from './Tab.svelte';
  import settingsIcon from '../icons/settings.svg';
  import { communities, activeCommunityId, activeChannelId, activeView } from '../stores/app';

  function selectCommunity(communityId: string) {
    $activeCommunityId = communityId;
    $activeView = 'hub';
  }

  function openProfile() {
    $activeView = 'profile';
    $activeCommunityId = null;
    $activeChannelId = null;
  }

  let showTooltip = false;

  function deployCommunity() {
    // TODO: Implement community deployment
    console.log('Deploy community hub');
  }
</script>

<div class="navbar">
  <div class="tab-list">
    {#each $communities as community}
      <div 
        on:click={() => selectCommunity(community.id)}
        on:keydown={(e) => e.key === 'Enter' && selectCommunity(community.id)}
        role="button"
        tabindex="0"
      >
        <Tab 
          label={community.name} 
          image={community.image}
          active={$activeView === 'hub' && $activeCommunityId === community.id}
        />
      </div>
    {/each}
  </div>
  <div class="tab-list bottom">
    <div class="tooltip-wrapper">
      <button 
        class="add-community-btn"
        on:click={deployCommunity}
        on:mouseenter={() => showTooltip = true}
        on:mouseleave={() => showTooltip = false}
        aria-label="Deploy a community hub"
      >
        <span class="plus-icon">+</span>
      </button>
      {#if showTooltip}
        <div class="tooltip">Deploy a Hub</div>
      {/if}
    </div>
    <div 
      on:click={openProfile}
      on:keydown={(e) => e.key === 'Enter' && openProfile()}
      role="button"
      tabindex="0"
    >
      <Tab label="Settings" image={settingsIcon} active={$activeView === 'profile'} />
    </div>
  </div>
</div>

<style>
  .navbar {
    width: 64px;
    height: 100%;
    background-color: #242424;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .tab-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .add-community-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #313338;
    border: 2px dashed #5865f2;
    color: #5865f2;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    outline: none;
  }

  .add-community-btn:hover {
    background: #5865f2;
    color: #ffffff;
    border-style: solid;
    transform: scale(1.05);
  }

  .add-community-btn:active {
    transform: scale(0.95);
  }

  .plus-icon {
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
  }

  .tooltip-wrapper {
    position: relative;
  }

  .tooltip {
    position: absolute;
    left: 72px;
    top: 50%;
    transform: translateY(-50%);
    background: #1e1f22;
    color: #f2f3f5;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.875rem;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    pointer-events: none;
    animation: tooltipFadeIn 0.15s ease-out;
  }

  .tooltip::before {
    content: '';
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 4px solid transparent;
    border-bottom: 4px solid transparent;
    border-right: 4px solid #1e1f22;
  }

  @keyframes tooltipFadeIn {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
    }
  }
</style>