<script lang="ts">
  import Tab from './Tab.svelte';
  import settingsIcon from '../icons/settings.svg';
  import { communities, activeCommunityId } from '../stores/app';

  function selectCommunity(communityId: string) {
    $activeCommunityId = communityId;
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
          active={$activeCommunityId === community.id}
        />
      </div>
    {/each}
  </div>
  <div class="tab-list bottom">
    <Tab label="Settings" image={settingsIcon} />
  </div>
</div>

<style>
  .navbar {
    width: 64px;
    height: 100%;
    background-color: #2b2c2c;
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