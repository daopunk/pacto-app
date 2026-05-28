<script lang="ts">
  import type { CommonsBroadcastDto } from '../../lib/commons/types';
  import { profiles } from '../../stores/profiles';
  import { squads } from '../../stores/squads';
  import { currentUser } from '../../stores/auth';
  import { getProfileDisplayName, getProfileAvatarSrc } from '../../lib/utils/profile';
  import { showToast } from '../../stores/toast';
  import { openCommonsUserMessage, sendCommonsJoinRequest } from '../../lib/commons/commons-card-actions';
  import { commonsJoinRequestBlockReason } from '../../lib/commons/commons-join-request';

  export let broadcast: CommonsBroadcastDto;

  let messageBusy = false;
  let joinBusy = false;
  let actionError = '';

  function formatExpiry(expiresAt: number): string {
    const ms = expiresAt * 1000 - Date.now();
    if (ms <= 0) return 'Expired';
    const totalMinutes = Math.floor(ms / 60000);
    if (totalMinutes < 60) return `${Math.max(totalMinutes, 1)}m left`;
    const h = Math.floor(totalMinutes / 60);
    if (h < 24) return `${h}h left`;
    const d = Math.floor(h / 24);
    return `${d}d left`;
  }

  $: isSquad = broadcast.subject === 'squad';
  $: isUser = broadcast.subject === 'user';
  $: userProfile = isUser ? $profiles[broadcast.authorNpub] : null;
  $: userLabel =
    isUser && userProfile
      ? getProfileDisplayName(userProfile) || broadcast.authorNpub.slice(0, 16) + '…'
      : isUser
        ? broadcast.authorNpub.slice(0, 16) + '…'
        : '';
  $: squadLabel = broadcast.squadName ?? 'Squad';
  $: squadIcon = isSquad ? broadcast.squadIconUrl : null;
  $: userAvatar = isUser ? getProfileAvatarSrc(userProfile) : null;
  $: subtitle = (() => {
    if (isUser && broadcast.audience) {
      return broadcast.audience === 'new_user' ? 'New user' : 'Active user';
    }
    if (isSquad) {
      return broadcast.squadKind === 'squad-pair' ? 'Partner squad' : 'Squad';
    }
    return 'User';
  })();
  $: localSquadIds = $squads.map((s) => s.id);
  $: myNpub = $currentUser?.npub;
  $: joinBlockReason = isSquad ? commonsJoinRequestBlockReason(broadcast, myNpub, localSquadIds) : null;
  $: canMessage = isUser && !!myNpub && broadcast.authorNpub !== myNpub;
  $: canJoin = isSquad && !joinBlockReason && !!myNpub;

  async function handleMessage() {
    if (!canMessage || messageBusy) return;
    actionError = '';
    messageBusy = true;
    try {
      openCommonsUserMessage(broadcast.authorNpub);
    } finally {
      messageBusy = false;
    }
  }

  async function handleJoinRequest() {
    if (!canJoin || !myNpub || joinBusy) return;
    actionError = '';
    joinBusy = true;
    try {
      const result = await sendCommonsJoinRequest(broadcast, myNpub, localSquadIds);
      if (!result.ok) {
        actionError = result.error;
        return;
      }
      showToast(`Join request sent for ${squadLabel}.`);
    } finally {
      joinBusy = false;
    }
  }
</script>

<article class="commons-card" class:commons-card-squad={isSquad} class:commons-card-user={isUser}>
  <header class="commons-card-header">
    <div class="commons-card-identity">
      {#if isSquad && squadIcon}
        <img src={squadIcon} alt="" class="commons-card-avatar" />
      {:else if isSquad}
        <div class="commons-card-avatar commons-card-avatar-ph" aria-hidden="true">
          {squadLabel.charAt(0).toUpperCase()}
        </div>
      {:else if userAvatar}
        <img src={userAvatar} alt="" class="commons-card-avatar" />
      {:else if isUser}
        <div class="commons-card-avatar commons-card-avatar-ph" aria-hidden="true">
          {userLabel.charAt(0).toUpperCase()}
        </div>
      {/if}
      <div>
        <h3 class="commons-card-title">{isSquad ? squadLabel : userLabel}</h3>
        <p class="commons-card-meta muted">{subtitle} · {formatExpiry(broadcast.expiresAt)}</p>
      </div>
    </div>
  </header>
  {#if broadcast.tags.length > 0}
    <ul class="commons-card-tags" role="list">
      {#each broadcast.tags as tag (tag)}
        <li>#{tag}</li>
      {/each}
    </ul>
  {/if}
  <p class="commons-card-message">{broadcast.message}</p>
  {#if canMessage || canJoin || joinBlockReason}
    <div class="commons-card-actions">
      {#if canMessage}
        <button type="button" class="commons-card-btn" disabled={messageBusy} on:click={handleMessage}>
          {messageBusy ? 'Opening…' : 'Message'}
        </button>
      {/if}
      {#if canJoin}
        <button type="button" class="commons-card-btn commons-card-btn-primary" disabled={joinBusy} on:click={handleJoinRequest}>
          {joinBusy ? 'Sending…' : 'Request to join'}
        </button>
      {:else if isSquad && joinBlockReason && myNpub && broadcast.authorNpub !== myNpub}
        <p class="commons-card-action-note muted">{joinBlockReason}</p>
      {/if}
    </div>
  {/if}
  {#if actionError}
    <p class="commons-card-error" role="alert">{actionError}</p>
  {/if}
</article>

<style>
  .commons-card {
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 14px 16px;
    background: var(--bg-elevated);
  }

  .commons-card-squad {
    border-left: 3px solid var(--accent);
  }

  .commons-card-header {
    margin-bottom: 8px;
  }

  .commons-card-identity {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .commons-card-avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
  }

  .commons-card-avatar-ph {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-panel);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 1rem;
  }

  .commons-card-user .commons-card-avatar,
  .commons-card-user .commons-card-avatar-ph {
    border-radius: 50%;
  }

  .commons-card-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .commons-card-meta {
    margin: 2px 0 0;
    font-size: 0.75rem;
  }

  .commons-card-tags {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .commons-card-tags li {
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--bg-panel);
    color: var(--text-secondary);
  }

  .commons-card-message {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .commons-card-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }

  .commons-card-btn {
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-panel);
    color: var(--text-secondary);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .commons-card-btn-primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-contrast, #fff);
  }

  .commons-card-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .commons-card-action-note {
    margin: 0;
    font-size: 0.75rem;
  }

  .commons-card-error {
    margin: 8px 0 0;
    font-size: 0.8125rem;
    color: var(--danger, #e55);
  }

  .muted {
    color: var(--text-muted);
  }
</style>
