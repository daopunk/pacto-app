<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from '../components/Navbar.svelte';
  import TopNavbar from '../components/TopNavbar.svelte';
  import CommunityNavbar from '../components/CommunityNavbar.svelte';
  import ChatView from '../components/ChatView.svelte';
  import Profile from '../components/Profile.svelte';
  import MessengerNavbar from '../components/MessengerNavbar.svelte';
  import MessengerChatView from '../components/MessengerChatView.svelte';
  import MessageInput from '../components/MessageInput.svelte';
  import { sendDmMessage } from '../lib/api/nostr';
  import { activeCommunityId, activeChannelId, activeView, activeTopNavTab, activeDmId, composingNewChat } from '../stores/app';

  function truncateNpub(n: string): string {
    if (n.length <= 16) return n;
    return n.slice(0, 8) + '…' + n.slice(-4);
  }

  async function handleDmSend(content: string) {
    const id = $activeDmId;
    if (!id) return;
    await sendDmMessage(id, content);
  }

  // Set default active community on mount
  onMount(() => {
    $activeCommunityId = 'community-1';
    $activeChannelId = 'channel-1';
  });
</script>

<div class="page">
  <header class="top-navbar-slot">
    <TopNavbar />
  </header>
  <main class="container">
    <Navbar />
    {#if $activeView === 'profile'}
      <Profile />
    {:else if $activeTopNavTab === 'dms'}
      <MessengerNavbar />
      {#if $composingNewChat}
        <MessengerChatView />
      {:else if $activeDmId}
        <div class="dm-thread">
          <div class="dm-thread-header">
            <h3 class="dm-thread-title">Conversation</h3>
            <span class="dm-thread-npub">{truncateNpub($activeDmId)}</span>
          </div>
          <div class="dm-thread-messages">
            <!-- Messages will load from backend when wired -->
            <p class="dm-thread-placeholder">Messages will appear here</p>
          </div>
          <MessageInput channelName={truncateNpub($activeDmId)} onSend={handleDmSend} />
        </div>
      {:else}
        <div class="dm-empty">
          <p>Select a conversation or start a new chat</p>
        </div>
      {/if}
    {:else}
      <CommunityNavbar />
      <ChatView />
    {/if}
  </main>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  .top-navbar-slot {
    flex-shrink: 0;
    z-index: 10;
  }
  .page .container {
    flex: 1;
    min-height: 0;
  }

  .dm-thread {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background-color: #313338;
  }

  .dm-thread-header {
    padding: 16px 24px;
    border-bottom: 1px solid #1e1f22;
  }

  .dm-thread-title {
    font-size: 1rem;
    font-weight: 600;
    color: #f2f3f5;
    margin: 0 0 2px;
  }

  .dm-thread-npub {
    font-size: 0.8125rem;
    color: #b5bac1;
  }

  .dm-thread-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .dm-thread-placeholder {
    font-size: 0.875rem;
    color: #6d6f78;
    margin: 0;
  }

  .dm-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #313338;
    color: #6d6f78;
    font-size: 0.9375rem;
  }
</style>
