import { describe, expect, it } from 'vitest';
import { parseParentDashboardChannelMode } from './app';

describe('parseParentDashboardChannelMode', () => {
  it('accepts current slugs', () => {
    expect(parseParentDashboardChannelMode('modules')).toBe('modules');
    expect(parseParentDashboardChannelMode('proposals')).toBe('proposals');
    expect(parseParentDashboardChannelMode('structure')).toBe('structure');
    expect(parseParentDashboardChannelMode('permissions')).toBe('permissions');
  });

  it('resets unknown stored values to modules', () => {
    expect(parseParentDashboardChannelMode(null)).toBe('modules');
    expect(parseParentDashboardChannelMode('')).toBe('modules');
    expect(parseParentDashboardChannelMode('nope')).toBe('modules');
    expect(parseParentDashboardChannelMode('treasury')).toBe('modules');
    expect(parseParentDashboardChannelMode('polls')).toBe('modules');
  });
});
