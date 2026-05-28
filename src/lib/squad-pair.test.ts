import { describe, expect, it } from 'vitest';
import {
  mergeNetworkRowsIntoSquads,
  networkToSquadPair,
  normalizeStoredSquad,
  partnerSquadsForAnchor,
  squadPairToNetwork,
  squadsToNetworkView,
} from './squad-pair';

const regularSquad = {
  id: 'squad-a',
  name: 'Squad A',
  channels: [{ name: 'announcements', groupId: 'g-a', order: 0 }],
  createdAt: 1,
  updatedAt: 1,
};

const squadPair = {
  id: 'pair-ab',
  name: 'A ↔ B',
  kind: 'squad-pair' as const,
  pairedSquads: [
    { id: 'squad-a', name: 'Squad A' },
    { id: 'squad-b', name: 'Squad B' },
  ] as const,
  channels: [{ name: 'announcements', groupId: 'g-pair', order: 0 }],
  createdAt: 2,
  updatedAt: 2,
};

describe('normalizeStoredSquad', () => {
  it('defaults missing kind to squad', () => {
    expect(normalizeStoredSquad(regularSquad).kind).toBe('squad');
    expect(normalizeStoredSquad(regularSquad).pairedSquads).toBeUndefined();
  });

  it('keeps squad-pair kind and normalizes pairedSquads to a pair', () => {
    const normalized = normalizeStoredSquad({
      ...squadPair,
      pairedSquads: [...squadPair.pairedSquads],
    });
    expect(normalized.kind).toBe('squad-pair');
    expect(normalized.pairedSquads).toEqual([
      { id: 'squad-a', name: 'Squad A' },
      { id: 'squad-b', name: 'Squad B' },
    ]);
  });

  it('drops invalid pairedSquads when fewer than two anchors', () => {
    const normalized = normalizeStoredSquad({
      ...squadPair,
      kind: 'squad-pair',
      pairedSquads: [{ id: 'squad-a', name: 'Squad A' }],
    });
    expect(normalized.pairedSquads).toBeUndefined();
  });
});

describe('networkToSquadPair', () => {
  it('maps memberSquads to pairedSquads with squad-pair kind', () => {
    const migrated = networkToSquadPair({
      id: 'net-1',
      name: 'Net One',
      channels: [{ name: 'announcements', groupId: 'g1', order: 0 }],
      memberSquads: [
        { id: 'squad-a', name: 'A' },
        { id: 'squad-b', name: 'B' },
      ],
      createdAt: 10,
      updatedAt: 10,
    });
    expect(migrated.kind).toBe('squad-pair');
    expect(migrated.pairedSquads).toEqual([
      { id: 'squad-a', name: 'A' },
      { id: 'squad-b', name: 'B' },
    ]);
  });
});

describe('squadPairToNetwork', () => {
  it('round-trips pairedSquads as memberSquads', () => {
    const network = squadPairToNetwork({
      ...squadPair,
      pairedSquads: [...squadPair.pairedSquads],
    });
    expect(network.memberSquads).toEqual([
      { id: 'squad-a', name: 'Squad A' },
      { id: 'squad-b', name: 'Squad B' },
    ]);
    expect(network.id).toBe('pair-ab');
  });
});

describe('partnerSquadsForAnchor', () => {
  it('returns squad-pairs that reference the anchor id', () => {
    const otherPair = {
      ...squadPair,
      id: 'pair-bc',
      name: 'B ↔ C',
      pairedSquads: [
        { id: 'squad-b', name: 'Squad B' },
        { id: 'squad-c', name: 'Squad C' },
      ] as const,
    };
    const list = partnerSquadsForAnchor(
      [regularSquad, { ...squadPair, pairedSquads: [...squadPair.pairedSquads] }, otherPair],
      'squad-a'
    );
    expect(list.map((s) => s.id)).toEqual(['pair-ab']);
  });

  it('returns empty when anchor has no partner squad-pairs', () => {
    expect(partnerSquadsForAnchor([regularSquad], 'squad-a')).toEqual([]);
  });
});

describe('mergeNetworkRowsIntoSquads', () => {
  it('appends network rows as squad-pairs without duplicating ids', () => {
    const merged = mergeNetworkRowsIntoSquads([regularSquad], [
      {
        id: 'pair-ab',
        name: 'From network store',
        channels: [{ name: 'announcements', groupId: 'g-pair', order: 0 }],
        memberSquads: [
          { id: 'squad-a', name: 'Squad A' },
          { id: 'squad-b', name: 'Squad B' },
        ],
        createdAt: 2,
        updatedAt: 2,
      },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[1].kind).toBe('squad-pair');
  });

  it('network store row wins over existing squad row with same id', () => {
    const merged = mergeNetworkRowsIntoSquads(
      [{ ...squadPair, name: 'Stale name', pairedSquads: [...squadPair.pairedSquads] }],
      [
        {
          id: 'pair-ab',
          name: 'Fresh from network',
          channels: squadPair.channels,
          memberSquads: [...squadPair.pairedSquads],
          createdAt: 2,
          updatedAt: 3,
        },
      ]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Fresh from network');
  });
});

describe('squadsToNetworkView', () => {
  it('projects squad-pairs to legacy network rows', () => {
    const view = squadsToNetworkView([
      regularSquad,
      { ...squadPair, pairedSquads: [...squadPair.pairedSquads] },
    ]);
    expect(view).toHaveLength(1);
    expect(view[0].id).toBe('pair-ab');
  });
});
