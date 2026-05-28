<script lang="ts">
  import { get } from 'svelte/store';
  import ParentSidebar from './ParentSidebar.svelte';
  import CreateChannelModal from '../channel/CreateChannelModal.svelte';
  import InviteToParentModal from '../channel/InviteToParentModal.svelte';
  import ExitParentModal from '../channel/ExitParentModal.svelte';
  import PairWithSquadModal from '../squad/PairWithSquadModal.svelte';
  import {
    squads,
    activeSquadId,
    activeChannelId,
    activeHubChannelName,
    activeView,
    activeTopNavTab,
    lastChannelBySquadId,
    lastHubChannelNameBySquadId,
    dmList,
    requestsList,
    pendingList,
    parentsCreatingAnnouncements,
    parentCreateErrorById,
    parentPendingCreateMembers,
    addParentCreatingAnnouncements,
    removeParentCreatingAnnouncements,
    DASHBOARD_CHANNEL_ID,
    DASHBOARD_CHANNEL_NAME,
    ANNOUNCEMENTS_CHANNEL_NAME,
    type Channel as ChannelType,
    type Squad,
  } from '../../stores/app';
  import {
    getAnnouncementsChannel,
    createDefaultParentChannels,
    uniqueChannelsByGroupIdPreservingOrder,
    loadMembersForParent,
    defaultParentInvitePhysicalGroupTargets,
  } from '../../lib/parent-navbar';
  import { resolveHubChannelNameForGroupSelection } from '../../lib/mls/virtual-channel-bucket';
  import {
    createGroupChat,
    getMlsGroupMembers,
    inviteMemberToGroup,
    sendDmMessage,
    formatChannelInSquadMessage,
    leaveMlsGroup,
  } from '../../lib/api/nostr';
  import { getInvokeErrorMessage, friendlyMessage } from '../../lib/utils/tauri-errors';
  import { pendingReadyToast, showToast } from '../../stores/toast';
  import { getProfileDisplayName } from '../../lib/utils/profile';
  import { profiles } from '../../stores/profiles';
  import { currentUser } from '../../stores/auth';
  import { partnerSquadsForHubParent } from '../../lib/squad-pair';
  import { activateSquadHub } from '../../lib/squad-hub-nav';
  import {
    buildPairedSquads,
    collectInviteNpubsForSquads,
    pairPartnerExcludeSquadIds,
    resolvePairAnchorFromHub,
    partnerSquadCandidates,
  } from '../../lib/squad-pair-create';
  import { sendSquadInviteDm } from '../../lib/pacto-app-inbox';

  $: activeParent = $squads.find((s) => s.id === $activeSquadId) as Squad | undefined;

  $: rawChannels = activeParent
    ? [...activeParent.channels].sort((a, b) => a.order - b.order)
    : [];
  $: channels = activeParent
    ? [{ name: DASHBOARD_CHANNEL_NAME, groupId: DASHBOARD_CHANNEL_ID, order: -1 }, ...rawChannels]
    : [];

  $: creating =
    activeParent &&
    activeParent.channels.length === 0 &&
    $parentsCreatingAnnouncements.has(activeParent.id);

  $: createError = activeParent ? $parentCreateErrorById[activeParent.id] ?? '' : '';

  $: canRetryCreate =
    activeParent &&
    createError &&
    ($parentPendingCreateMembers[activeParent.id]?.length ?? 0) > 0;

  $: subheading =
    activeParent &&
    activeParent.kind === 'squad-pair' &&
    activeParent.pairedSquads
      ? activeParent.pairedSquads.map((s) => s.name).join(', ')
      : undefined;

  $: showPartnerSquadsSection = !!activeParent && !!$activeSquadId;

  $: partnerSquads =
    showPartnerSquadsSection && $activeSquadId
      ? partnerSquadsForHubParent($squads, $activeSquadId).map((s) => ({ id: s.id, name: s.name }))
      : [];

  $: pairAnchorSquad =
    activeParent && showPartnerSquadsSection ? resolvePairAnchorFromHub(activeParent, $squads) : undefined;

  $: canPairFromHub = !!pairAnchorSquad;

  $: activePartnerSquadId =
    activeParent && activeParent.kind === 'squad-pair' ? activeParent.id : null;

  function selectPartnerSquad(squadPairId: string) {
    activateSquadHub(squadPairId);
  }

  let showPairWithSquadModal = false;
  let pairCreateError = '';
  let pairCreating = false;
  let pairModal: PairWithSquadModal;

  $: pairPartnerCandidates =
    pairAnchorSquad && activeParent
      ? partnerSquadCandidates(
          $squads,
          pairAnchorSquad.id,
          pairPartnerExcludeSquadIds(activeParent, pairAnchorSquad)
        )
      : [];

  function openPairWithSquadModal() {
    if (!canPairFromHub || !showPartnerSquadsSection || !canShowParentMenuActions) return;
    pairCreateError = '';
    showPairWithSquadModal = true;
    pairModal?.resetForm();
  }

  function closePairWithSquadModal() {
    if (pairCreating) return;
    showPairWithSquadModal = false;
    pairCreateError = '';
  }

  async function handleCreateSquadPair(params: {
    name: string;
    partnerSquadId: string;
    iconUrl?: string;
  }) {
    const anchor = pairAnchorSquad;
    if (!anchor || pairCreating) return;
    const partner = $squads.find((s) => s.id === params.partnerSquadId);
    if (!partner) {
      pairCreateError = 'Could not find the selected squads.';
      return;
    }
    pairCreating = true;
    pairCreateError = '';
    try {
      const memberNpubs = await collectInviteNpubsForSquads(
        [anchor, partner],
        $currentUser?.npub,
        (gid) => getMlsGroupMembers(gid)
      );
      if (memberNpubs.length === 0) {
        pairCreateError = 'No other members to invite in these squads.';
        return;
      }
      showPairWithSquadModal = false;
      createSquadPairWithAnnouncements(params.name, memberNpubs, anchor, partner, params.iconUrl);
    } catch (e) {
      pairCreateError = friendlyMessage(getInvokeErrorMessage(e));
    } finally {
      pairCreating = false;
    }
  }

  function createSquadPairWithAnnouncements(
    name: string,
    memberNpubs: string[],
    anchor: Squad,
    partner: Squad,
    iconUrl?: string
  ) {
    const pairedSquads = buildPairedSquads(anchor, partner);
    const now = Date.now();
    const tempId = 'creating-squad-pair-' + now;
    const squadPair: Squad = {
      id: tempId,
      name,
      iconUrl,
      channels: [],
      kind: 'squad-pair',
      pairedSquads,
      createdAt: now,
      updatedAt: now,
    };
    addParentCreatingAnnouncements(squadPair.id);
    parentPendingCreateMembers.update((m) => ({ ...m, [squadPair.id]: memberNpubs }));
    squads.update((list) => [...list, squadPair]);
    activeSquadId.set(tempId);
    activeChannelId.set(null);
    activeHubChannelName.set(null);
    activeView.set('hub');
    activeTopNavTab.set('squads');

    (async () => {
      try {
        const { parentId, channels } = await createDefaultParentChannels(memberNpubs);
        const groupId = parentId;
        const paired = buildPairedSquads(anchor, partner);
        squads.update((list) =>
          list.map((s) =>
            s.id !== tempId
              ? s
              : {
                  ...s,
                  id: groupId,
                  channels,
                  kind: 'squad-pair' as const,
                  pairedSquads: paired,
                  updatedAt: Date.now(),
                }
          )
        );
        removeParentCreatingAnnouncements(tempId);
        parentCreateErrorById.update((m) => {
          const next = { ...m };
          delete next[tempId];
          return next;
        });
        parentPendingCreateMembers.update((m) => {
          const next = { ...m };
          delete next[tempId];
          return next;
        });
        activateSquadHub(groupId);
        pendingReadyToast.set({
          text: `${name} is ready!`,
          goTo: {
            type: 'squad',
            name,
            id: groupId,
            channelId: groupId,
            hubChannelName:
              channels.find((c) => c.name === ANNOUNCEMENTS_CHANNEL_NAME)?.name ?? channels[0]?.name,
          },
        });
        const myNpub = get(currentUser)?.npub;
        for (const npub of memberNpubs) {
          try {
            await sendSquadInviteDm(
              npub,
              {
                squadName: name,
                groupId,
                kind: 'squad-pair',
                pairedSquads: paired,
              },
              myNpub
            );
          } catch (e) {
            console.warn('[ParentNavbar] send squad-pair invite failed for', npub.slice(0, 20) + '…', e);
          }
        }
      } catch (e) {
        removeParentCreatingAnnouncements(tempId);
        parentCreateErrorById.update((m) => ({
          ...m,
          [tempId]: friendlyMessage(
            getInvokeErrorMessage(e, 'Failed to create partner squad announcements channel')
          ),
        }));
        squads.update((list) => list.filter((s) => s.id !== tempId));
        if (get(activeSquadId) === tempId) {
          activeSquadId.set(anchor.id);
          activeChannelId.set(null);
          activeHubChannelName.set(null);
        }
      }
    })();
  }

  $: emptyMessage = 'Select a squad';

  $: canShowParentMenuActions =
    !!activeParent && !creating && activeParent.channels.length > 0;

  let retryingCreate = false;
  let inviteErrorBanner = '';
  let createChannelErrorBanner = '';

  $: errorBanners = [
    ...(inviteErrorBanner ? [{ id: 'invite', text: inviteErrorBanner }] : []),
    ...(createChannelErrorBanner ? [{ id: 'createChannel', text: createChannelErrorBanner }] : []),
  ];

  function onDismissBanner(id: string) {
    if (id === 'invite') inviteErrorBanner = '';
    if (id === 'createChannel') createChannelErrorBanner = '';
  }

  function selectChannel(channel: { groupId: string; name: string }) {
    activeChannelId.set(channel.groupId);
    activeHubChannelName.set(channel.groupId === DASHBOARD_CHANNEL_ID ? null : channel.name);
    activeView.set('hub');
    if ($activeSquadId) {
      const sid = $activeSquadId;
      lastChannelBySquadId.update((m) => ({ ...m, [sid]: channel.groupId }));
      lastHubChannelNameBySquadId.update((m) => {
        const next = { ...m };
        if (channel.groupId === DASHBOARD_CHANNEL_ID) delete next[sid];
        else next[sid] = channel.name;
        return next;
      });
    }
  }

  async function handleRetryCreate() {
    const parent = activeParent;
    if (!parent || !createError || retryingCreate) return;
    const memberIds = $parentPendingCreateMembers[parent.id];
    if (!memberIds?.length) return;
    retryingCreate = true;
    try {
      const { parentId: gid, channels } = await createDefaultParentChannels(memberIds);
      squads.update((list) =>
        list.map((s) =>
          s.id !== parent.id ? s : { ...s, id: gid, channels, updatedAt: Date.now() }
        )
      );
      if (get(activeSquadId) === parent.id) {
        activeSquadId.set(gid);
        activeChannelId.set(gid);
        const hub =
          channels.find((c) => c.name === ANNOUNCEMENTS_CHANNEL_NAME)?.name ?? channels[0]?.name ?? null;
        activeHubChannelName.set(hub);
      }
      lastChannelBySquadId.update((m) => {
        const next = { ...m };
        delete next[parent.id];
        return { ...next, [gid]: gid };
      });
      lastHubChannelNameBySquadId.update((m) => {
        const next = { ...m };
        delete next[parent.id];
        const hubName =
          channels.find((c) => c.name === ANNOUNCEMENTS_CHANNEL_NAME)?.name ?? channels[0]?.name ?? '';
        return hubName ? { ...next, [gid]: hubName } : next;
      });
      pendingReadyToast.set({
        text: `${parent.name} is ready!`,
        goTo: {
          type: 'squad',
          name: parent.name,
          id: gid,
          channelId: gid,
          hubChannelName:
            channels.find((c) => c.name === ANNOUNCEMENTS_CHANNEL_NAME)?.name ?? channels[0]?.name,
        },
      });
      removeParentCreatingAnnouncements(parent.id);
      parentCreateErrorById.update((m) => {
        const next = { ...m };
        delete next[parent.id];
        return next;
      });
      parentPendingCreateMembers.update((m) => {
        const next = { ...m };
        delete next[parent.id];
        return next;
      });
      const myNpub = get(currentUser)?.npub;
      for (const npub of memberIds) {
        try {
          await sendSquadInviteDm(npub, { squadName: parent.name, groupId: gid }, myNpub);
        } catch (e) {
          console.warn('[ParentNavbar] retry send squad invite DM failed for', npub.slice(0, 20) + '…', e);
        }
      }
    } catch (e) {
      parentCreateErrorById.update((m) => ({
        ...m,
        [parent.id]: friendlyMessage(getInvokeErrorMessage(e)),
      }));
    } finally {
      retryingCreate = false;
    }
  }

  let showCreateChannelModal = false;
  let createChannelName = '';
  let selectedNpubs: string[] = [];
  let createChannelError = '';
  let createChannelMemberList: string[] = [];
  let loadingCreateChannelMembers = false;

  function openCreateChannelModal() {
    showCreateChannelModal = true;
    createChannelName = '';
    selectedNpubs = [];
    createChannelError = '';
    createChannelMemberList = [];
    loadCreateChannelMembers();
  }

  async function loadCreateChannelMembers() {
    const parent = $squads.find((s) => s.id === $activeSquadId);
    if (!parent) return;
    loadingCreateChannelMembers = true;
    try {
      createChannelMemberList = await loadMembersForParent(parent, $currentUser?.npub);
    } catch {
      createChannelMemberList = [];
    } finally {
      loadingCreateChannelMembers = false;
    }
  }

  function closeCreateChannelModal() {
    showCreateChannelModal = false;
  }

  function toggleMember(npub: string) {
    selectedNpubs = selectedNpubs.includes(npub)
      ? selectedNpubs.filter((n) => n !== npub)
      : [...selectedNpubs, npub];
  }

  $: canCreateChannel = createChannelName.trim().length > 0 && selectedNpubs.length > 0;

  $: createChannelAllSelected =
    createChannelMemberList.length > 0 &&
    selectedNpubs.length === createChannelMemberList.length &&
    createChannelMemberList.every((n) => selectedNpubs.includes(n));

  function toggleCreateChannelSelectEveryone() {
    if (createChannelAllSelected) {
      selectedNpubs = [];
    } else {
      selectedNpubs = [...createChannelMemberList];
    }
  }

  async function handleCreateChannel() {
    const name = createChannelName.trim();
    if (!name) return;
    if (selectedNpubs.length === 0) {
      createChannelError = 'Select at least one member';
      return;
    }
    const parent = activeParent;
    if (!parent) {
      createChannelError = 'Squad not found';
      return;
    }
    createChannelError = '';
    createChannelErrorBanner = '';
    const placeholderId = `creating-${Date.now()}`;
    const placeholderChannel: ChannelType = { name, groupId: placeholderId, order: parent.channels.length };

    squads.update((list) =>
      list.map((s) =>
        s.id !== $activeSquadId ? s : { ...s, channels: [...s.channels, placeholderChannel] }
      )
    );
    activeChannelId.set(placeholderId);
    activeHubChannelName.set(name);
    activeView.set('hub');
    lastChannelBySquadId.update((m) => ({ ...m, [$activeSquadId!]: placeholderId }));
    lastHubChannelNameBySquadId.update((m) => ({ ...m, [$activeSquadId!]: name }));

    closeCreateChannelModal();

    ;(async () => {
      try {
        const groupId = await createGroupChat(name, selectedNpubs);
        const squadId = get(activeSquadId);
        squads.update((list) =>
          list.map((s) => {
            if (s.id !== squadId) return s;
            const chs = s.channels.map((ch) =>
              ch.groupId === placeholderId ? { name, groupId, order: ch.order } : ch
            );
            return { ...s, channels: chs };
          })
        );
        if (get(activeChannelId) === placeholderId) {
          activeChannelId.set(groupId);
          activeHubChannelName.set(name);
        }
        const announcementsChannel = getAnnouncementsChannel(parent);
        const payload = formatChannelInSquadMessage({
          type: 'channel_in_squad',
          squadName: parent.name,
          announcementsGroupId: announcementsChannel.groupId,
          channelGroupId: groupId,
          channelName: name,
        });
        for (const npub of selectedNpubs) {
          try {
            await sendDmMessage(npub, payload);
          } catch (e) {
            console.warn('[ParentNavbar] send channel_in_squad DM failed for', npub.slice(0, 20) + '…', e);
          }
        }
      } catch (e) {
        createChannelErrorBanner = friendlyMessage(getInvokeErrorMessage(e));
        setTimeout(() => {
          createChannelErrorBanner = '';
        }, 8000);
        const squadId = get(activeSquadId);
        squads.update((list) =>
          list.map((s) => {
            if (s.id !== squadId) return s;
            const chs = s.channels.filter((ch) => ch.groupId !== placeholderId);
            return { ...s, channels: chs };
          })
        );
        if (get(activeChannelId) === placeholderId) {
          const list = get(squads);
          const still = list.find((s) => s.id === squadId);
          const sorted = still?.channels.slice().sort((a, b) => a.order - b.order) ?? [];
          const gid = sorted[0]?.groupId ?? null;
          activeChannelId.set(gid);
          activeHubChannelName.set(gid ? resolveHubChannelNameForGroupSelection(sorted, gid, null) : null);
        }
      }
    })();
  }

  function getMemberDisplayName(npub: string) {
    return getProfileDisplayName($profiles[npub] ?? null) || npub.slice(0, 16) + '…';
  }

  let showInviteModal = false;
  let inviteCandidates: string[] = [];
  let selectedInviteNpubs: string[] = [];
  let inviteByNpub = '';
  let loadingInvite = false;
  let inviteError = '';
  let inviting = false;

  function openInviteModal() {
    showInviteModal = true;
    selectedInviteNpubs = [];
    inviteByNpub = '';
    inviteError = '';
    loadInviteCandidates();
  }

  function toggleInviteCandidate(npub: string) {
    selectedInviteNpubs = selectedInviteNpubs.includes(npub)
      ? selectedInviteNpubs.filter((n) => n !== npub)
      : [...selectedInviteNpubs, npub];
  }

  async function loadInviteCandidates() {
    const parent = activeParent;
    if (!parent) return;
    loadingInvite = true;
    try {
      const inParent = new Set(await loadMembersForParent(parent, undefined));
      const dmListSnap = $dmList;
      const requestsSnap = $requestsList;
      const pendingSnap = $pendingList;
      const allDmNpubs = [...dmListSnap, ...requestsSnap, ...pendingSnap].map((e) => e.npub);
      const uniqueNpubs = [...new Set(allDmNpubs)];
      inviteCandidates = uniqueNpubs.filter((npub) => !inParent.has(npub));
    } catch {
      inviteCandidates = [];
    } finally {
      loadingInvite = false;
    }
  }

  function closeInviteModal() {
    if (!inviting) showInviteModal = false;
  }

  async function handleInvite() {
    const parent = activeParent;
    if (!parent) return;
    const extraNpub = inviteByNpub.trim();
    const npubsToInvite = [
      ...selectedInviteNpubs,
      ...(extraNpub && extraNpub.startsWith('npub1') ? [extraNpub] : []),
    ];
    if (npubsToInvite.length === 0) {
      inviteError =
        extraNpub
          ? 'Please enter a valid npub (starts with npub1) or pick from the list.'
          : 'Select at least one person or enter an npub.';
      return;
    }
    if (extraNpub && !extraNpub.startsWith('npub1')) {
      inviteError = 'Please enter a valid npub (starts with npub1) or pick from the list.';
      return;
    }
    inviteError = '';
    inviteErrorBanner = '';
    showInviteModal = false;
    inviting = true;
    const announcementsChannel = getAnnouncementsChannel(parent);
    const inviteTargets = defaultParentInvitePhysicalGroupTargets(parent);
    const groupId = announcementsChannel.groupId;

    ;(async () => {
      let lastErr = '';
      const myNpub = get(currentUser)?.npub;
      for (const npub of npubsToInvite) {
        for (const ch of inviteTargets) {
          try {
            await inviteMemberToGroup(ch.groupId, npub);
          } catch (e) {
            console.warn('[ParentNavbar] invite to squad MLS channel failed for', npub.slice(0, 20) + '…', e);
            lastErr = friendlyMessage(getInvokeErrorMessage(e));
          }
        }
        try {
          await sendSquadInviteDm(npub, { squadName: parent.name, groupId }, myNpub);
        } catch (e) {
          console.warn('[ParentNavbar] invite to squad failed for', npub.slice(0, 20) + '…', e);
          lastErr = friendlyMessage(getInvokeErrorMessage(e));
        }
      }
      if (lastErr) {
        inviteErrorBanner = lastErr;
        setTimeout(() => {
          inviteErrorBanner = '';
        }, 8000);
      }
      inviting = false;
    })();
  }

  let showExitModal = false;
  let exitError = '';

  function showChangeEvmSignerPlaceholder() {
    if (!canShowParentMenuActions || !activeParent) return;
    showToast(
      'Set your squad signer under Settings → Default wallet config (Edit).'
    );
  }

  function openExitModal() {
    showExitModal = true;
    exitError = '';
  }

  function closeExitModal() {
    showExitModal = false;
  }

  function handleExitParent() {
    const squad = $squads.find((s) => s.id === $activeSquadId);
    if (!squad) return;
    const wasActive = $activeSquadId === squad.id;
    const previousChannelId = $activeChannelId;

    squads.update((list) => list.filter((s) => s.id !== squad.id));
    if (wasActive) {
      activeSquadId.set(null);
      activeChannelId.set(null);
      activeHubChannelName.set(null);
    }
    showExitModal = false;
    exitError = '';

    (async () => {
      try {
        for (const ch of uniqueChannelsByGroupIdPreservingOrder(squad.channels)) {
          await leaveMlsGroup(ch.groupId);
        }
      } catch (e) {
        const msg = friendlyMessage(getInvokeErrorMessage(e));
        squads.update((list) => [...list, squad]);
        if (wasActive) {
          activeSquadId.set(squad.id);
          const gid = previousChannelId ?? squad.channels[0]?.groupId ?? null;
          activeChannelId.set(gid);
          activeHubChannelName.set(
            gid
              ? resolveHubChannelNameForGroupSelection(
                  squad.channels,
                  gid,
                  get(lastHubChannelNameBySquadId)[squad.id] || null
                )
              : null
          );
        }
        showToast(`Could not exit squad "${squad.name}": ${msg}`);
      }
    })();
  }
</script>

<ParentSidebar
  parentName={activeParent?.name ?? ''}
  subheading={subheading}
  channels={channels}
  activeChannelId={$activeChannelId}
  activeHubChannelName={$activeHubChannelName}
  activeView={$activeView}
  creating={Boolean(creating)}
  createError={createError}
  canRetryCreate={Boolean(canRetryCreate)}
  retryingCreate={retryingCreate}
  emptyMessage={emptyMessage}
  hasParent={!!activeParent}
  errorBanners={errorBanners}
  onDismissBanner={onDismissBanner}
  onSelectChannel={selectChannel}
  onCreateChannel={openCreateChannelModal}
  onRetryCreate={handleRetryCreate}
  onInvite={openInviteModal}
  onChangeEvmSigner={canShowParentMenuActions ? showChangeEvmSignerPlaceholder : undefined}
  onExitSquad={openExitModal}
  partnerSquads={partnerSquads}
  activePartnerSquadId={activePartnerSquadId}
  onSelectPartnerSquad={selectPartnerSquad}
  showPairWithSquadAction={canPairFromHub && showPartnerSquadsSection && !!canShowParentMenuActions}
  onPairWithSquad={openPairWithSquadModal}
/>

<CreateChannelModal
  open={showCreateChannelModal}
  parentName={activeParent?.name ?? ''}
  subtitle={"Add a channel to " + (activeParent?.name ?? 'this squad') + ". Choose a name and at least one member."}
  membersLabel="Members (squad announcements only, select at least one)"
  bind:channelName={createChannelName}
  memberList={createChannelMemberList}
  loading={loadingCreateChannelMembers}
  bind:selectedNpubs={selectedNpubs}
  selectAllLabel="Add everyone in squad"
  emptyMessage="Invite people to the squad (announcements) first to add them to new channels."
  error={createChannelError}
  creating={false}
  canCreate={canCreateChannel}
  onClose={closeCreateChannelModal}
  onCreate={handleCreateChannel}
  onToggleMember={toggleMember}
  onToggleSelectAll={toggleCreateChannelSelectEveryone}
  getMemberDisplayName={getMemberDisplayName}
/>

<InviteToParentModal
  open={showInviteModal}
  parentName={activeParent?.name ?? ''}
  title="Invite to Squad"
  subtitle={"Invite friends to " + (activeParent?.name ?? 'this Squad') + "."}
  candidates={inviteCandidates}
  bind:selectedNpubs={selectedInviteNpubs}
  bind:inviteByNpub={inviteByNpub}
  loading={loadingInvite}
  emptyMessage="No one to invite right now. Start a DM with someone first, or they may already be in this Squad."
  error={inviteError}
  inviting={inviting}
  onClose={closeInviteModal}
  onInvite={handleInvite}
  onToggleCandidate={toggleInviteCandidate}
  getCandidateDisplayName={getMemberDisplayName}
/>

<ExitParentModal
  open={showExitModal}
  parentName={activeParent?.name ?? ''}
  error={exitError}
  exiting={false}
  onClose={closeExitModal}
  onConfirm={handleExitParent}
/>

<PairWithSquadModal
  bind:this={pairModal}
  open={showPairWithSquadModal}
  anchorSquadName={activeParent?.name ?? pairAnchorSquad?.name ?? ''}
  candidates={pairPartnerCandidates}
  error={pairCreateError}
  creating={pairCreating}
  onClose={closePairWithSquadModal}
  onCreate={handleCreateSquadPair}
/>
