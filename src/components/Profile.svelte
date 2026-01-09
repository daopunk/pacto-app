<script lang="ts">
  import { onMount } from 'svelte';
  import { loadProfile, profiles, profileLoadingStates } from '../stores/profiles';

  // For testing, we'll need an npub - you'll replace this with the actual logged-in user
  let testNpub = 'npub17mfu73mgy8fm9jn5jyepekedqph2y9pf9rf8g4gvg6ftqpxsy24q5mzhwj';
  
  $: profile = $profiles[testNpub];
  $: loading = $profileLoadingStates[testNpub] || false;
  
  let error: string | null = null;

  onMount(async () => {
    try {
      await loadProfile(testNpub);
    } catch (e: any) {
      error = e.message || 'Failed to load profile';
      console.error('Profile load error:', e);
    }
  });
</script>

<div class="profile-view">
  <div class="profile-container">
    <h1>Profile</h1>
    
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading profile...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p>❌ {error}</p>
        <p class="error-detail">Make sure you're logged in and the npub is correct.</p>
      </div>
    {:else if profile}
      <div class="profile-content">
        <!-- Avatar -->
        <div class="avatar-section">
          {#if profile.avatar}
            <img src={profile.avatar} alt={profile.display_name || profile.name} class="avatar" />
          {:else}
            <div class="avatar-placeholder">
              {(profile.display_name || profile.name || 'U').charAt(0).toUpperCase()}
            </div>
          {/if}
        </div>

        <!-- Profile Info -->
        <div class="info-section">
          <h2>{profile.display_name || profile.name || 'Anonymous'}</h2>
          {#if profile.nickname}
            <p class="nickname">aka "{profile.nickname}"</p>
          {/if}
          
          {#if profile.nip05}
            <p class="nip05">✓ {profile.nip05}</p>
          {/if}

          {#if profile.about}
            <p class="about">{profile.about}</p>
          {/if}

          {#if profile.website}
            <a href={profile.website} target="_blank" rel="noopener noreferrer" class="website">
              🌐 {profile.website}
            </a>
          {/if}

          <!-- Lightning Address -->
          {#if profile.lud16 || profile.lud06}
            <p class="lightning">⚡ {profile.lud16 || profile.lud06}</p>
          {/if}

          <!-- Debug Info -->
          <div class="debug-info">
            <p class="meta">ID: {profile.id}</p>
            <p class="meta">Last Updated: {new Date(profile.last_updated * 1000).toLocaleString()}</p>
            <p class="meta">Muted: {profile.muted ? 'Yes' : 'No'} | Bot: {profile.bot ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    {:else}
      <div class="empty-state">
        <p>No profile loaded</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #242424;
    height: 100%;
    overflow-y: auto;
    border-left: 1px solid #313338;
  }

  .profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 32px;
    width: 100%;
  }

  h1 {
    color: #f2f3f5;
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 32px 0;
  }

  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 16px;
    color: #949ba4;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #313338;
    border-top-color: #5865f2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-state {
    color: #f23f42;
  }

  .error-detail {
    color: #949ba4;
    font-size: 0.875rem;
    margin-top: 8px;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .avatar-section {
    display: flex;
    justify-content: center;
  }

  .avatar {
    width: 128px;
    height: 128px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #313338;
  }

  .avatar-placeholder {
    width: 128px;
    height: 128px;
    border-radius: 50%;
    background: #5865f2;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: 600;
    font-size: 3rem;
    border: 4px solid #313338;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  h2 {
    color: #f2f3f5;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .nickname {
    color: #949ba4;
    font-style: italic;
    margin: 0;
  }

  .nip05 {
    color: #3ba55c;
    font-size: 0.875rem;
    margin: 0;
  }

  .about {
    color: #dbdee1;
    line-height: 1.5;
    margin: 0;
  }

  .website {
    color: #5865f2;
    text-decoration: none;
    font-size: 0.9375rem;
  }

  .website:hover {
    text-decoration: underline;
  }

  .lightning {
    color: #faa61a;
    font-size: 0.9375rem;
    margin: 0;
    font-family: monospace;
  }

  .debug-info {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #313338;
  }

  .meta {
    color: #6d6f78;
    font-size: 0.75rem;
    margin: 4px 0;
    font-family: monospace;
  }
</style>

