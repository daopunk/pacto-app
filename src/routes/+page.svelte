<script lang="ts">
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import Navbar from '../components/Navbar.svelte';
  import TopNavbar from '../components/TopNavbar.svelte';
  import SquadNavbar from '../components/SquadNavbar.svelte';
  import ChatView from '../components/ChatView.svelte';
  import Profile from '../components/Profile.svelte';
  import MessengerNavbar from '../components/MessengerNavbar.svelte';
  import MessengerChatView from '../components/MessengerChatView.svelte';
  import Message from '../components/Message.svelte';
  import MessageInput from '../components/MessageInput.svelte';
  import { getDmMessages, getChatMessageCount, sendDmMessage, queueProfileSync, fetchMessages } from '../lib/api/nostr';
  import { getInvokeErrorMessage, friendlyMessage } from '../lib/utils/tauri-errors';
  import { dmLog, dmError } from '../lib/utils/dm-debug';
  import { isAuthenticated } from '../stores/auth';
  import {
    activeSquadId,
    activeChannelId,
    activeView,
    activeTopNavTab,
    activeDmId,
    composingNewChat,
    backendDmMessages,
    messageCountByChat,
    loadedOffsetByChat,
    dmList,
    dmSendError,
    type DmMessage,
  } from '../stores/app';

  const PAGE_SIZE = 100;
  const LOAD_OLDER_PAGE_SIZE = 50;

  let dmMessagesContainer: HTMLDivElement;
  let prevDmId: string | null = null;
  let loadingOlder = false;

  // Clear send error when user switches to a different DM
  $: if (prevDmId !== $activeDmId) {
    prevDmId = $activeDmId;
    if (prevDmId != null) $dmSendError = null;
  }

  function truncateNpub(n: string): string {
    if (n.length <= 16) return n;
    return n.slice(0, 8) + '…' + n.slice(-4);
  }

  // Backend messages for active DM, sorted by at (oldest first). Backend emits message_new on send.
  $: mergedDmMessages = (() => {
    const npub = $activeDmId;
    if (!npub) return [];
    const list = [...($backendDmMessages[npub] ?? [])];
    list.sort((a, b) => a.at - b.at);
    return list;
  })();

  // Load backend messages when active DM changes; queue profile sync, get total count (DM_FLOW §5.2).
  $: if ($activeDmId && $activeTopNavTab === 'dms') {
    const npub = $activeDmId;
    dmLog('open conversation', { npub: npub.slice(0, 20) + '…', tab: 'dms' });
    queueProfileSync(npub).catch(() => {});
    getChatMessageCount(npub)
      .then((count) => {
        messageCountByChat.update((byChat) => ({ ...byChat, [npub]: count }));
      })
      .catch((err) => {
        dmError('open conversation: getChatMessageCount failed', err);
      });
    getDmMessages(npub, PAGE_SIZE, 0)
      .then((msgs) => {
        dmLog('open conversation: messages loaded', { npub: npub.slice(0, 20) + '…', count: msgs.length });
        backendDmMessages.update((byNpub) => ({
          ...byNpub,
          [npub]: msgs as DmMessage[],
        }));
        loadedOffsetByChat.update((by) => ({ ...by, [npub]: PAGE_SIZE }));
      })
      .catch((err) => {
        dmError('open conversation: getDmMessages failed', err);
      });
  }

  async function loadOlder() {
    const npub = $activeDmId;
    if (!npub || loadingOlder) return;
    const currentOffset = $loadedOffsetByChat[npub] ?? PAGE_SIZE;
    loadingOlder = true;
    dmLog('loadOlder', { npub: npub.slice(0, 20) + '…', offset: currentOffset });
    try {
      const older = await getDmMessages(npub, LOAD_OLDER_PAGE_SIZE, currentOffset);
      backendDmMessages.update((byNpub) => {
        const list = byNpub[npub] ?? [];
        const ids = new Set(list.map((m) => m.id));
        const newMsgs = (older as DmMessage[]).filter((m) => !ids.has(m.id));
        if (newMsgs.length === 0) return byNpub;
        dmLog('loadOlder: prepending', { count: newMsgs.length });
        return { ...byNpub, [npub]: [...newMsgs, ...list] };
      });
      loadedOffsetByChat.update((by) => ({ ...by, [npub]: currentOffset + LOAD_OLDER_PAGE_SIZE }));
    } catch (err) {
      dmError('loadOlder failed', err);
    } finally {
      loadingOlder = false;
    }
  }

  $: canLoadOlder =
    $activeDmId &&
    !loadingOlder &&
    (($messageCountByChat[$activeDmId] ?? 0) > ($backendDmMessages[$activeDmId]?.length ?? 0));

  function toMessageProps(msg: DmMessage) {
    return {
      authorName: msg.mine ? 'You' : (msg.npub ? truncateNpub(msg.npub) : 'Unknown'),
      content: msg.content,
      timestamp: new Date(msg.at).toISOString(),
      avatar: '',
    };
  }

  async function handleDmSend(content: string) {
    const id = $activeDmId;
    if (!id) return;
    dmLog('handleDmSend', { receiver: id.slice(0, 20) + '…', contentLen: content.length });
    $dmSendError = null;
    try {
      const ok = await sendDmMessage(id, content);
      dmLog('handleDmSend result', { ok });
      if (!ok) {
        $dmSendError = friendlyMessage(
          'Could not deliver to relays. Message may appear as pending or failed.',
          'dm_send'
        );
      }
    } catch (e: unknown) {
      const raw = getInvokeErrorMessage(e, 'Failed to send message');
      $dmSendError = friendlyMessage(raw, 'dm_send');
      dmError('handleDmSend error', e);
    }
  }

  onMount(() => {
    $activeSquadId = 'squad-1';
    $activeChannelId = 'channel-1';

    // Pull DMs from Nostr relays when app loads (if already authenticated)
    if ($isAuthenticated) {
      dmLog('onMount: authenticated, calling fetchMessages(true)');
      fetchMessages(true).catch((e) => dmError('onMount: fetchMessages(true) failed', e));
    }

    const unlistenNew = listen<{ message: DmMessage; chat_id: string }>('message_new', (event) => {
      const { message, chat_id } = event.payload;
      dmLog('message_new', { chat_id: chat_id.slice(0, 20) + '…', messageId: message.id?.slice(0, 12), mine: message.mine });
      if (!chat_id.startsWith('npub1')) return;
      const m: DmMessage = {
        id: message.id,
        content: message.content,
        at: message.at,
        mine: message.mine,
        npub: message.npub,
        pending: message.pending,
        failed: message.failed,
      };
      backendDmMessages.update((byNpub) => {
        const list = byNpub[chat_id] ?? [];
        if (list.some((x) => x.id === m.id)) return byNpub;
        // Replace optimistic message (opt-*) with same content when backend confirms (avoids duplicate)
        const withoutOpt = list.filter(
          (x) => !(x.id.startsWith('opt-') && x.mine && x.content === m.content)
        );
        return { ...byNpub, [chat_id]: [...withoutOpt, m] };
      });
      // Add new DM to list if not already present; if present, move to top (last activity order, DM_FLOW §5.1)
      dmList.update((list) => {
        const entry = list.find((e) => e.npub === chat_id);
        const newEntry = entry ?? { npub: chat_id };
        const rest = list.filter((e) => e.npub !== chat_id);
        return [newEntry, ...rest];
      });
    });

    const unlistenUpdate = listen<{ old_id: string; message: DmMessage; chat_id: string }>(
      'message_update',
      (event) => {
        const { old_id, message, chat_id } = event.payload;
        dmLog('message_update', { chat_id: chat_id.slice(0, 20) + '…', old_id: old_id?.slice(0, 12), new_id: message.id?.slice(0, 12) });
        if (!chat_id.startsWith('npub1')) return;
        const m: DmMessage = {
          id: message.id,
          content: message.content,
          at: message.at,
          mine: message.mine,
          npub: message.npub,
          pending: message.pending,
          failed: message.failed,
        };
        backendDmMessages.update((byNpub) => {
          const list = byNpub[chat_id] ?? [];
          const out = list.filter((x) => x.id !== old_id && x.id !== m.id);
          return { ...byNpub, [chat_id]: [...out, m].sort((a, b) => a.at - b.at) };
        });
      }
    );

    // Drive historical sync: backend emits sync_slice_finished after each 2-day window; we must call fetch_messages(init: false) to get the next window (DM_FLOW §3.1, §11).
    const unlistenSyncSlice = listen('sync_slice_finished', () => {
      dmLog('sync_slice_finished → fetchMessages(false)');
      fetchMessages(false).catch((e) => {
        dmError('sync_slice_finished: fetchMessages(false) failed', e);
      });
    });

    const unlistenSyncFinished = listen('sync_finished', () => {
      dmLog('sync_finished (historical sync complete)');
    });

    return () => {
      unlistenNew.then((fn) => fn());
      unlistenUpdate.then((fn) => fn());
      unlistenSyncSlice.then((fn) => fn());
      unlistenSyncFinished.then((fn) => fn());
    };
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
          <div class="dm-thread-messages" bind:this={dmMessagesContainer}>
            {#if canLoadOlder}
              <div class="dm-thread-load-older">
                <button
                  type="button"
                  class="load-older-btn"
                  on:click={loadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            {/if}
            {#if mergedDmMessages.length > 0}
              {#each mergedDmMessages as msg (msg.id)}
                <Message {...toMessageProps(msg)} />
              {/each}
            {:else}
              <p class="dm-thread-placeholder">No messages yet</p>
            {/if}
          </div>
          {#if $dmSendError}
            <p class="dm-thread-error" role="alert">{$dmSendError}</p>
          {/if}
          <MessageInput channelName={truncateNpub($activeDmId)} onSend={handleDmSend} />
        </div>
      {:else}
        <div class="dm-empty">
          <p>Select a conversation or start a new chat</p>
        </div>
      {/if}
    {:else}
      <SquadNavbar />
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

  .dm-thread-load-older {
    margin-bottom: 16px;
  }

  .load-older-btn {
    padding: 8px 16px;
    font-size: 0.875rem;
    color: #b5bac1;
    background: #383a40;
    border: 1px solid #1e1f22;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
  }

  .load-older-btn:hover:not(:disabled) {
    color: #f2f3f5;
    background: #4e5058;
  }

  .load-older-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dm-thread-placeholder {
    font-size: 0.875rem;
    color: #6d6f78;
    margin: 0;
  }

  .dm-thread-error {
    font-size: 0.875rem;
    color: #ed4245;
    margin: 0;
    padding: 8px 24px;
    background-color: rgba(237, 66, 69, 0.1);
    border-top: 1px solid #1e1f22;
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
