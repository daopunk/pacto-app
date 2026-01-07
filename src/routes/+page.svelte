<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from 'svelte';
  import Navbar from '../components/Navbar.svelte';
  import CommunityNavbar from '../components/CommunityNavbar.svelte';
  import { activeCommunityId, activeChannelId } from '../stores/app';

  // Set default active community on mount
  onMount(() => {
    $activeCommunityId = 'community-1';
    $activeChannelId = 'channel-1';
  });
</script>

<main class="container">
  <Navbar />
  <CommunityNavbar />
</main>
