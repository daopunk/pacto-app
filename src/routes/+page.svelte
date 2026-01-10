<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from 'svelte';
  import Navbar from '../components/Navbar.svelte';
  import CommunityNavbar from '../components/CommunityNavbar.svelte';
  import ChatView from '../components/ChatView.svelte';
  import Profile from '../components/Profile.svelte';
  import { activeCommunityId, activeChannelId, activeView } from '../stores/app';

  // Set default active community on mount
  onMount(() => {
    $activeCommunityId = 'community-1';
    $activeChannelId = 'channel-1';
  });
</script>

<main class="container">
  <Navbar />
  {#if $activeView === 'hub'}
    <CommunityNavbar />
    <ChatView />
  {:else if $activeView === 'profile'}
    <Profile />
  {/if}
</main>
