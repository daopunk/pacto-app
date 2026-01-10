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
  }
</style>