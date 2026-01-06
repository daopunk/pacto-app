<script lang="ts">
  import Tab from './Tab.svelte';
  import settingsIcon from '../icons/settings.svg';
</script>

<div class="navbar">
  <div class="tab-list">
    <Tab label="Home" />
    <Tab label="Servers" />
    <Tab label="Explore" />
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