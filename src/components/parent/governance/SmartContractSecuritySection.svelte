<script lang="ts">
  /** Placeholder until Phase I (squad contract allowlist). */
  export let canManage = false;
</script>

<section class="smart-contract-security" aria-labelledby="smart-contract-security-heading">
  <h4 id="smart-contract-security-heading" class="roles-table-caption">Smart contract security</h4>
  <p class="smart-contract-security-lead muted">
    Role-approved members will manage a squad allowlist of contract addresses so members can sign
    calls to unofficial protocols with their <strong>squad EVM keys</strong> — in addition to the
    built-in Pacto Gov and Safe commands.
  </p>
  {#if canManage}
    <p class="smart-contract-security-note">Allowlist editing ships in a later release (execution step 16).</p>
  {:else}
    <p class="smart-contract-security-note muted">Only Role-approved members can add contracts here once enabled.</p>
  {/if}
</section>

<style>
  .smart-contract-security {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .smart-contract-security-lead,
  .smart-contract-security-note {
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0 0 8px 0;
  }

  .muted {
    color: var(--text-muted);
  }
</style>
