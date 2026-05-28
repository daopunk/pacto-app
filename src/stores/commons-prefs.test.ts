import { describe, expect, it } from 'vitest';
import { normalizeCommonsUserPrefs } from './commons-prefs';

describe('normalizeCommonsUserPrefs', () => {
  it('defaults to private', () => {
    expect(normalizeCommonsUserPrefs(null)).toEqual({ visibility: 'private' });
    expect(normalizeCommonsUserPrefs({ visibility: 'private' })).toEqual({ visibility: 'private' });
  });

  it('keeps public visibility', () => {
    expect(normalizeCommonsUserPrefs({ visibility: 'public' })).toEqual({ visibility: 'public' });
  });
});
