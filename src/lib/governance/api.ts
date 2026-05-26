import { invoke } from '@tauri-apps/api/core';

/** Mirrors `SquadInfraRow` from Tauri (`serde(rename_all = "camelCase")`). */
export interface SquadInfraDto {
  id: string;
  parentId: string;
  infraType: string;
  chain: string;
  canonicalRef: string;
  pactoGovRevision?: string;
  providerPayload?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

/** Dashboard compat until all surfaces use `infraType` directly. */
export function squadInfraLegacyProvider(infraType: string): string {
  if (infraType === 'standalone_safe') return 'gnosis_safe';
  return infraType;
}

export type ParentGovernanceDto = SquadInfraDto & { provider: string };

export function withLegacyProvider(row: SquadInfraDto): ParentGovernanceDto {
  return { ...row, provider: squadInfraLegacyProvider(row.infraType) };
}

/** Primary row for legacy single-row dashboard surfaces (prefers pacto_gov). */
export function primaryGovernanceView(
  rows: SquadInfraDto[] | undefined,
): ParentGovernanceDto | null | undefined {
  if (rows === undefined) return undefined;
  if (rows.length === 0) return null;
  const row =
    rows.find((r) => r.infraType === 'pacto_gov') ??
    rows.find((r) => r.infraType === 'standalone_safe') ??
    rows[0];
  return withLegacyProvider(row);
}

/** Backend: `list_squad_infra`. */
export async function listSquadInfra(parentId: string): Promise<SquadInfraDto[]> {
  const rows = (await invoke('list_squad_infra', { parentId })) as SquadInfraDto[] | null | undefined;
  return rows ?? [];
}

/** Backend: `upsert_squad_infra`. */
export async function upsertSquadInfra(params: {
  id: string;
  parentId: string;
  infraType: string;
  chain?: string | null;
  canonicalRef: string;
  pactoGovRevision?: string | null;
  providerPayload?: string | null;
}): Promise<void> {
  await invoke('upsert_squad_infra', {
    id: params.id,
    parentId: params.parentId,
    infraType: params.infraType,
    chain: params.chain ?? null,
    canonicalRef: params.canonicalRef,
    pactoGovRevision: params.pactoGovRevision ?? null,
    providerPayload: params.providerPayload ?? null,
  });
}

/** Stable id for pacto-gov infra row per parent. */
export function pactoGovInfraId(parentId: string): string {
  return `pacto-gov-${parentId}`;
}

/** Maps legacy announce / UI provider strings to squad infra types. */
export function infraTypeFromLegacyProvider(provider: string): string {
  const p = provider.trim().toLowerCase();
  if (p === 'gnosis_safe' || p === 'gnosis-safe' || p === 'safe') return 'standalone_safe';
  if (p === 'pacto-gov') return 'pacto_gov';
  if (p === 'squad_sponsor') return 'sponsor';
  return p;
}

/** Stable id for squad sponsor infra row per parent. */
export function squadSponsorInfraId(parentId: string): string {
  return `sponsor-${parentId}`;
}

/** Sponsor infra row for a parent, if any. */
export function sponsorInfraRow(rows: SquadInfraDto[] | undefined): SquadInfraDto | null {
  return rows?.find((r) => r.infraType === 'sponsor') ?? null;
}

export function hasSponsorInfra(rows: SquadInfraDto[] | undefined): boolean {
  return sponsorInfraRow(rows) != null;
}

/** Warn when pool balance falls below this wei threshold (0.005 ETH). */
export const SPONSOR_LOW_BALANCE_WEI = 5_000_000_000_000_000n;

/** Mirrors `SquadSponsorDepositResult` from Tauri (`serde(rename_all = "camelCase")`). */
export interface SquadSponsorDepositResultDto {
  txHash: string;
  chain: string;
  chainId: number;
  sponsorAddress: string;
  amountWei: string;
  poolBalanceWei: string;
}

/** Backend: `deposit_squad_sponsor`. */
export async function depositSquadSponsor(params: {
  network: string;
  parentId: string;
  amountWei: string;
  sponsorAddress?: string | null;
}): Promise<SquadSponsorDepositResultDto> {
  return (await invoke('deposit_squad_sponsor', {
    network: params.network,
    parentId: params.parentId,
    amountWei: params.amountWei.trim(),
    sponsorAddress: params.sponsorAddress?.trim() ? params.sponsorAddress.trim() : null,
  })) as SquadSponsorDepositResultDto;
}

/** Mirrors `SquadSponsorDeployResult` from Tauri (`serde(rename_all = "camelCase")`). */
export interface SquadSponsorDeployResultDto {
  txHash: string;
  chain: string;
  chainId: number;
  squadId: string;
  sponsorAddress: string;
  paymasterAddress: string;
  variant: string;
  providerPayload: string;
  infraRowId: string;
}

/** Backend: `deploy_squad_sponsor_for_parent`. */
export async function deploySquadSponsorForParent(params: {
  network: string;
  parentId: string;
  initialDepositWei?: string | null;
}): Promise<SquadSponsorDeployResultDto> {
  return (await invoke('deploy_squad_sponsor_for_parent', {
    network: params.network,
    parentId: params.parentId,
    initialDepositWei: params.initialDepositWei?.trim() ? params.initialDepositWei.trim() : null,
  })) as SquadSponsorDeployResultDto;
}

/** Mirrors `SquadSponsorSummary` from Tauri (`serde(rename_all = "camelCase")`). */
export interface SquadSponsorSummaryDto {
  chain: string;
  chainId: number;
  parentId: string;
  squadId: string;
  sponsorAddress: string;
  paymasterAddress: string;
  variant: string;
  topHatId: string;
  poolBalanceWei: string;
  totalShares: string;
}

/** Backend: `get_squad_sponsor_summary`. */
export async function getSquadSponsorSummary(params: {
  network: string;
  parentId: string;
  sponsorAddress?: string | null;
}): Promise<SquadSponsorSummaryDto> {
  return (await invoke('get_squad_sponsor_summary', {
    network: params.network,
    parentId: params.parentId,
    sponsorAddress: params.sponsorAddress?.trim() ? params.sponsorAddress.trim() : null,
  })) as SquadSponsorSummaryDto;
}

/** Wire payload for `governance_updated` when squad sponsor infra is deployed or refreshed. */
export function buildSponsorGovernanceAnnouncePayload(params: {
  parentId: string;
  sponsorAddress: string;
  chain: string;
  providerPayload: string;
  entryId: string;
}): {
  parent_id: string;
  provider: 'sponsor';
  canonical_ref: string;
  chain: string;
  entry_id: string;
  provider_payload: string;
} {
  return {
    parent_id: params.parentId,
    provider: 'sponsor',
    canonical_ref: params.sponsorAddress,
    chain: params.chain,
    entry_id: params.entryId,
    provider_payload: params.providerPayload,
  };
}

/** Mirrors `NavePirataDeployResult` from Tauri (`serde(rename_all = "camelCase")`). */
export interface NavePirataDeployResultDto {
  txHash: string;
  chain: string;
  chainId: number;
  topHatId: string;
  safeAddress: string;
  quartermaster: string;
  mutinyModule: string;
  treasuryAuthority: string;
  squadAdminProxy: string;
  providerPayload: string;
}

/** Backend: `deploy_nave_pirata_for_parent`. */
export async function deployNavePirataForParent(params: {
  network: string;
  parentId: string;
  captain: string;
  metadataUri: string;
  saltNonce?: string | null;
}): Promise<NavePirataDeployResultDto> {
  return (await invoke('deploy_nave_pirata_for_parent', {
    network: params.network,
    parentId: params.parentId,
    captain: params.captain,
    metadataUri: params.metadataUri.trim(),
    saltNonce: params.saltNonce?.trim() ? params.saltNonce.trim() : null,
  })) as NavePirataDeployResultDto;
}
