/** Squad vs squad-pair (partner coordination) — see ai-docs/networks/RNF_PLAN.md */

export type SquadKind = 'squad' | 'squad-pair';

export type PairedSquadRef = { id: string; name: string };

/** Exactly two anchor squads when a squad-pair is fully specified. */
export type PairedSquads = [PairedSquadRef, PairedSquadRef];

export interface SquadChannelRow {
  name: string;
  groupId: string;
  order: number;
}

export interface StoredSquadRow {
  id: string;
  name: string;
  iconUrl?: string;
  channels: SquadChannelRow[];
  kind?: SquadKind;
  pairedSquads?: PairedSquadRef[] | PairedSquads;
  createdAt: number;
  updatedAt: number;
}

/** Legacy network row shape (pre-RNF); migrated into squads as squad-pair. */
export interface LegacyNetworkRow {
  id: string;
  name: string;
  iconUrl?: string;
  channels: SquadChannelRow[];
  memberSquads: { id: string; name: string }[];
  createdAt: number;
  updatedAt: number;
}

export function isSquadPairKind(kind: SquadKind | undefined): boolean {
  return kind === 'squad-pair';
}

function normalizePairedSquads(raw: PairedSquadRef[] | undefined): PairedSquads | undefined {
  if (!raw || raw.length < 2) return undefined;
  const a = raw[0];
  const b = raw[1];
  if (typeof a?.id !== 'string' || typeof a?.name !== 'string') return undefined;
  if (typeof b?.id !== 'string' || typeof b?.name !== 'string') return undefined;
  return [{ id: a.id, name: a.name }, { id: b.id, name: b.name }];
}

/** Normalize a squad row from localStorage; default kind is `squad`. */
export function normalizeStoredSquad(raw: StoredSquadRow): StoredSquadRow {
  const kind: SquadKind = raw.kind === 'squad-pair' ? 'squad-pair' : 'squad';
  const pairedSquads =
    kind === 'squad-pair' ? normalizePairedSquads(raw.pairedSquads) : undefined;
  return {
    id: raw.id,
    name: raw.name,
    iconUrl: raw.iconUrl,
    channels: raw.channels,
    kind,
    pairedSquads,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Convert a legacy network row into a squad-pair squad row. TODO: delete after RNF-5. */
export function networkToSquadPair(network: LegacyNetworkRow): StoredSquadRow {
  return normalizeStoredSquad({
    id: network.id,
    name: network.name,
    iconUrl: network.iconUrl,
    channels: network.channels,
    kind: 'squad-pair',
    pairedSquads: network.memberSquads,
    createdAt: network.createdAt,
    updatedAt: network.updatedAt,
  });
}

/** View-model for legacy `Network` store paths. TODO: delete after RNF-5. */
export function squadPairToNetwork(squad: StoredSquadRow): LegacyNetworkRow {
  return {
    id: squad.id,
    name: squad.name,
    iconUrl: squad.iconUrl,
    channels: squad.channels,
    memberSquads: squad.pairedSquads ? [...squad.pairedSquads] : [],
    createdAt: squad.createdAt,
    updatedAt: squad.updatedAt,
  };
}

/** Squad-pairs linked to an anchor squad (Partner Squads sidebar index). */
export function partnerSquadsForAnchor(allSquads: StoredSquadRow[], anchorSquadId: string): StoredSquadRow[] {
  return allSquads.filter(
    (s) =>
      s.kind === 'squad-pair' &&
      s.pairedSquads?.some((p) => p.id === anchorSquadId)
  );
}

/**
 * Keep `squads` as source of truth while legacy `networks` store still exists.
 * TODO: delete after RNF-5.
 */
export function mergeNetworkRowsIntoSquads(
  squads: StoredSquadRow[],
  networks: LegacyNetworkRow[]
): StoredSquadRow[] {
  const networkSquads = networks.map(networkToSquadPair);
  const networkIds = new Set(networkSquads.map((s) => s.id));
  const regular = squads.filter((s) => !networkIds.has(s.id));
  return [...regular, ...networkSquads];
}

/** Legacy Networks tab projection from squads. TODO: delete after RNF-5. */
export function squadsToNetworkView(squads: StoredSquadRow[]): LegacyNetworkRow[] {
  return squads.filter((s) => s.kind === 'squad-pair').map(squadPairToNetwork);
}
