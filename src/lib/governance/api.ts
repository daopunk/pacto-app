import { invoke } from '@tauri-apps/api/core';

/** Mirrors `ParentGovernanceRow` from Tauri (`serde(rename_all = "camelCase")`). */
export interface ParentGovernanceDto {
  parentId: string;
  provider: string;
  chain: string;
  canonicalRef: string;
  pactoGovRevision?: string;
  providerPayload?: string;
  createdAtMs: number;
  updatedAtMs: number;
}

/** Backend: `get_parent_governance`. */
export async function getParentGovernance(parentId: string): Promise<ParentGovernanceDto | null> {
  const row = (await invoke('get_parent_governance', { parentId })) as ParentGovernanceDto | null | undefined;
  return row ?? null;
}

/** Backend: `upsert_parent_governance`. */
export async function upsertParentGovernance(params: {
  parentId: string;
  provider: string;
  chain?: string | null;
  canonicalRef: string;
  pactoGovRevision?: string | null;
  providerPayload?: string | null;
}): Promise<void> {
  await invoke('upsert_parent_governance', {
    parentId: params.parentId,
    provider: params.provider,
    chain: params.chain ?? null,
    canonicalRef: params.canonicalRef,
    pactoGovRevision: params.pactoGovRevision ?? null,
    providerPayload: params.providerPayload ?? null,
  });
}

/** Backend: `clear_parent_governance`. */
export async function clearParentGovernance(parentId: string): Promise<void> {
  await invoke('clear_parent_governance', { parentId });
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
