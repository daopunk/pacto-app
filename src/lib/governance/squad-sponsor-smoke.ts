import {
  deploySquadSponsorForParent,
  getSquadSponsorSummary,
  listSquadInfra,
  type SquadInfraDto,
  type SquadSponsorDeployResultDto,
  type SquadSponsorSummaryDto,
} from './api';

export interface SquadSponsorSmokeChecks {
  infraRowPresent: boolean;
  infraRowIdMatches: boolean;
  canonicalRefMatchesDeploy: boolean;
  summarySponsorMatchesDeploy: boolean;
  poolBalanceReadable: boolean;
}

export interface SquadSponsorSmokeResult {
  deploy: SquadSponsorDeployResultDto;
  summary: SquadSponsorSummaryDto;
  infraRows: SquadInfraDto[];
  checks: SquadSponsorSmokeChecks;
  passed: boolean;
}

/** Sprint-1 smoke: deploy Ext sponsor on Sepolia, read pool summary, confirm SQLite infra row. */
export async function runSquadSponsorSepoliaSmoke(params: {
  parentId: string;
  /** Optional wei sent with factory deploy (payable `createSquadSponsorExt`). */
  initialDepositWei?: string | null;
}): Promise<SquadSponsorSmokeResult> {
  const parentId = params.parentId.trim();
  if (!parentId) {
    throw new Error('parentId is required');
  }

  const deploy = await deploySquadSponsorForParent({
    network: 'sepolia',
    parentId,
    initialDepositWei: params.initialDepositWei ?? null,
  });

  const summary = await getSquadSponsorSummary({
    network: 'sepolia',
    parentId,
    sponsorAddress: deploy.sponsorAddress,
  });

  const infraRows = await listSquadInfra(parentId);
  const sponsorRow = infraRows.find((r) => r.infraType === 'sponsor') ?? null;

  const checks: SquadSponsorSmokeChecks = {
    infraRowPresent: sponsorRow != null,
    infraRowIdMatches: sponsorRow?.id === deploy.infraRowId,
    canonicalRefMatchesDeploy:
      sponsorRow != null &&
      sponsorRow.canonicalRef.toLowerCase() === deploy.sponsorAddress.toLowerCase(),
    summarySponsorMatchesDeploy:
      summary.sponsorAddress.toLowerCase() === deploy.sponsorAddress.toLowerCase(),
    poolBalanceReadable: /^\d+$/.test(summary.poolBalanceWei.trim()),
  };

  const passed = Object.values(checks).every(Boolean);

  return { deploy, summary, infraRows, checks, passed };
}
