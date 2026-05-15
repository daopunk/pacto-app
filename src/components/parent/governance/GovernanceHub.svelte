<script lang="ts">
  import type { ParentGovernanceDto } from '../../../lib/governance/api';
  import type { TreasurySafeEntry } from '../../../lib/treasury/treasury-safes';
  import { explorerAddressUrl, parseSupportedChainId } from '../../../lib/wallet/chains';
  import { openExternalUrl } from '../../../lib/utils/open-external';
  import { showToast } from '../../../stores/toast';

  export let parentType: 'squad' | 'network';
  /** `undefined` while hydrating; `null` when no SQLite row. */
  export let governanceConfig: ParentGovernanceDto | null | undefined;
  export let treasurySafes: TreasurySafeEntry[] = [];
  export let hasAnnouncementsChannel = false;
  export let onOpenPactoDeploy: () => void;
  export let onOpenSafeDeploy: () => void;
  export let onOpenSafeImport: () => void;

  function chainLabel(chain: string): string {
    const c = chain?.toLowerCase() ?? '';
    if (c === 'mainnet') return 'Ethereum';
    if (c === 'optimism') return 'Optimism';
    if (c === 'sepolia') return 'Sepolia';
    return chain || '—';
  }

  function providerHeading(provider: string): string {
    switch (provider) {
      case 'pacto_gov':
        return 'Pacto Gov';
      case 'gnosis_safe':
        return 'Gnosis Safe';
      case 'bread_coop':
        return 'Bread Cooperative';
      default:
        return provider;
    }
  }

  function scrollToMultisigSection() {
    document.getElementById('safe-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handlePactoDeployClick() {
    if (!hasAnnouncementsChannel) return;
    onOpenPactoDeploy();
  }

  function guardedSafeDeploy() {
    if (!hasAnnouncementsChannel) {
      showToast(`Add an announcements channel for this ${parentType} before linking a Safe.`);
      return;
    }
    onOpenSafeDeploy();
  }

  function guardedSafeImport() {
    if (!hasAnnouncementsChannel) {
      showToast(`Add an announcements channel for this ${parentType} before linking a Safe.`);
      return;
    }
    onOpenSafeImport();
  }

  function openPrimarySafeExplorer(entry: TreasurySafeEntry) {
    const url = explorerAddressUrl(parseSupportedChainId(entry.chain), entry.safeAddress);
    if (url) openExternalUrl(url);
  }

  $: primaryTreasury = treasurySafes?.[0];
</script>

<section class="dashboard-section governance-hub" aria-labelledby="gov-heading">
  <h3 id="gov-heading" class="section-heading">Governance</h3>

  {#if governanceConfig === undefined}
    <p class="dashboard-placeholder-text muted">Loading governance settings…</p>
  {:else if governanceConfig === null}
    <p class="gov-intro dashboard-placeholder-text">
      Choose how this {parentType} coordinates treasury decisions and upgrades on-chain.
    </p>
    {#if !hasAnnouncementsChannel}
      <p class="gov-channel-note muted" role="status">
        Deploy and announcement flows need an #announcements channel on this {parentType}.
      </p>
    {/if}
    <ul class="governance-picker" role="list">
      <li class="governance-picker-card governance-picker-card--primary">
        <h4 class="gov-card-title">Pacto Gov</h4>
        <p class="gov-card-desc">
          Deploy the Nave Pirata stack from our pinned factory (Hats-compatible roles and squads).
        </p>
        <button
          type="button"
          class="btn-primary gov-card-btn"
          disabled={!hasAnnouncementsChannel}
          on:click={handlePactoDeployClick}
        >
          Set up Pacto Gov
        </button>
      </li>
      <li class="governance-picker-card">
        <h4 class="gov-card-title">Gnosis Safe</h4>
        <p class="gov-card-desc">
          Reuse Treasury: deploy a new multisig or import an existing Safe address.
        </p>
        <div class="gov-card-actions">
          <button
            type="button"
            class="btn-primary gov-card-btn"
            disabled={!hasAnnouncementsChannel}
            on:click={guardedSafeDeploy}
          >
            Deploy Safe
          </button>
          <button
            type="button"
            class="btn-secondary gov-card-btn"
            disabled={!hasAnnouncementsChannel}
            on:click={guardedSafeImport}
          >
            Import Safe
          </button>
        </div>
      </li>
      <li class="governance-picker-card governance-picker-card--muted">
        <h4 class="gov-card-title">Bread Cooperative</h4>
        <p class="gov-card-desc muted">Reserved for cooperative governance. Not available in this release.</p>
        <button type="button" class="btn-secondary gov-card-btn" disabled>Coming later</button>
      </li>
    </ul>
  {:else if governanceConfig.provider === 'pacto_gov'}
    <div class="governance-summary">
      <p class="gov-summary-lead">
        This {parentType} uses <strong>{providerHeading(governanceConfig.provider)}</strong> on
        <strong>{chainLabel(governanceConfig.chain)}</strong>.
      </p>
      <dl class="gov-summary-dl">
        <dt>Hat tree id</dt>
        <dd><code class="gov-mono">{governanceConfig.canonicalRef}</code></dd>
        {#if governanceConfig.pactoGovRevision}
          <dt>pacto-gov revision</dt>
          <dd><code class="gov-mono">{governanceConfig.pactoGovRevision}</code></dd>
        {/if}
      </dl>
      <p class="muted gov-summary-footnote">
        Upgrade paths and deep links will appear here as the stack grows.
      </p>
    </div>
  {:else if governanceConfig.provider === 'gnosis_safe'}
    <div class="governance-summary">
      <p class="gov-summary-lead">
        Governance is anchored on <strong>Gnosis Safe</strong> ({chainLabel(governanceConfig.chain)}). Linked
        multisigs are listed above under Multisig.
      </p>
      {#if primaryTreasury}
        <p class="gov-safe-preview">
          <span class="gov-safe-preview-label">Primary Safe</span>
          <code class="gov-mono" title={primaryTreasury.safeAddress}>{primaryTreasury.safeAddress}</code>
          {#if explorerAddressUrl(parseSupportedChainId(primaryTreasury.chain), primaryTreasury.safeAddress)}
            <button
              type="button"
              class="btn-link gov-explorer-link"
              on:click={() => openPrimarySafeExplorer(primaryTreasury)}
            >
              View on explorer
            </button>
          {/if}
        </p>
      {:else}
        <p class="muted">No Safe linked yet. Deploy or import one using Multisig above.</p>
      {/if}
      <button type="button" class="btn-secondary gov-treasury-link-btn" on:click={scrollToMultisigSection}>
        View Multisig section
      </button>
    </div>
  {:else}
    <div class="governance-summary">
      <p class="gov-summary-lead">
        Library: <strong>{providerHeading(governanceConfig.provider)}</strong> ({chainLabel(
          governanceConfig.chain,
        )}).
      </p>
      <p class="muted">Details for this provider are not shown in the UI yet.</p>
    </div>
  {/if}
</section>

<style>
  .governance-hub {
    padding-bottom: 8px;
  }

  .gov-intro {
    margin-top: 0;
    margin-bottom: 16px;
    max-width: 52ch;
  }

  .gov-channel-note {
    font-size: 0.875rem;
    margin: -8px 0 16px;
    max-width: 52ch;
  }

  .governance-picker {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }

  .governance-picker-card {
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 16px;
    background: var(--bg-elevated);
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .governance-picker-card--primary {
    border-color: var(--border-strong, var(--border-subtle));
  }

  .governance-picker-card--muted {
    opacity: 0.85;
  }

  .gov-card-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .gov-card-desc {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--text-secondary);
    flex: 1;
  }

  .gov-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .gov-card-btn {
    align-self: flex-start;
  }

  .governance-summary {
    margin-top: 4px;
    max-width: min(100%, 560px);
  }

  .gov-summary-lead {
    margin: 0 0 14px;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .gov-summary-dl {
    margin: 0 0 12px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 14px;
    font-size: 0.875rem;
  }

  .gov-summary-dl dt {
    margin: 0;
    color: var(--text-muted);
    font-weight: 500;
  }

  .gov-summary-dl dd {
    margin: 0;
    word-break: break-all;
  }

  .gov-mono {
    font-size: 0.8125rem;
    color: var(--text-primary);
  }

  .gov-summary-footnote {
    margin: 0;
    font-size: 0.8125rem;
  }

  .gov-safe-preview {
    margin: 0 0 12px;
    font-size: 0.875rem;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 12px;
  }

  .gov-safe-preview-label {
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: 100%;
  }

  .gov-explorer-link {
    padding: 0;
    font-size: inherit;
  }

  .gov-treasury-link-btn {
    margin-top: 4px;
  }
</style>
