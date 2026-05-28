import { describe, expect, it } from 'vitest';
import { resolveHubParentSquad, resolveOpenHubParent } from './squad-hub-nav';
import type { Squad } from '../stores/app';

const regular: Squad = {
  id: 'squad-a',
  name: 'Squad A',
  channels: [],
  kind: 'squad',
  createdAt: 1,
  updatedAt: 1,
};

const pair: Squad = {
  id: 'pair-ab',
  name: 'A ↔ B',
  channels: [],
  kind: 'squad-pair',
  pairedSquads: [
    { id: 'squad-a', name: 'Squad A' },
    { id: 'squad-b', name: 'Squad B' },
  ],
  createdAt: 2,
  updatedAt: 2,
};

describe('resolveHubParentSquad', () => {
  it('finds squad by id', () => {
    expect(resolveHubParentSquad([regular, pair], 'pair-ab')).toEqual(pair);
  });
});

describe('resolveOpenHubParent', () => {
  it('resolves from squads tab via activeSquadId', () => {
    expect(resolveOpenHubParent([regular, pair], 'squads', 'pair-ab', null)).toEqual(pair);
  });

  it('resolves squad-pair from legacy networks tab via activeNetworkId', () => {
    expect(resolveOpenHubParent([regular, pair], 'networks', null, 'pair-ab')).toEqual(pair);
  });

  it('returns null when no matching parent', () => {
    expect(resolveOpenHubParent([regular], 'squads', 'missing', null)).toBeNull();
  });
});
