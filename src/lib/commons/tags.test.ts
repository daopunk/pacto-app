import { describe, expect, it } from 'vitest';
import { normalizeCommonsTag, normalizeCommonsTags } from './tags';

describe('normalizeCommonsTag', () => {
  it('strips hash and lowercases', () => {
    expect(normalizeCommonsTag('#Neo')).toBe('neo');
    expect(normalizeCommonsTag('DAO')).toBe('dao');
  });

  it('rejects invalid characters', () => {
    expect(normalizeCommonsTag('bad-hyphen')).toBeNull();
    expect(normalizeCommonsTag('')).toBeNull();
  });
});

describe('normalizeCommonsTags', () => {
  it('dedupes and caps at three', () => {
    expect(normalizeCommonsTags(['#neo', 'NEO', 'dao'])).toEqual(['neo', 'dao']);
    expect(normalizeCommonsTags(['a', 'b', 'c', 'd'])).toBeNull();
  });

  it('requires at least one tag', () => {
    expect(normalizeCommonsTags([])).toBeNull();
  });
});
