import { describe, expect, it } from 'vitest';
import { resolveUserBroadcastAudience } from './user-broadcast';

describe('resolveUserBroadcastAudience', () => {
  it('maps single audience selections', () => {
    expect(resolveUserBroadcastAudience(true, false)).toBe('new_user');
    expect(resolveUserBroadcastAudience(false, true)).toBe('active_user');
  });

  it('returns null when both or neither selected', () => {
    expect(resolveUserBroadcastAudience(true, true)).toBeNull();
    expect(resolveUserBroadcastAudience(false, false)).toBeNull();
  });
});
