<script lang="ts">
  import Tab from './Tab.svelte';
</script>

<!-- Left side vertical navbar -->

<div class="navbar">
  <div style="display: flex; justify-content: center;">
    <div class="tab-list">
      <Tab label="Home" active={true} />
      <Tab label="Servers" />
      <Tab label="Explore" />
      <Tab label="Settings" />
    </div>
  </div>
</div>

<style>
  .navbar {
    width: 100px;
    height: 100%;
    background-color: #2b2c2c;
  }
</style>