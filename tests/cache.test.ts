import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppCache, TtlCache } from '../src/cache/cache.js';

describe('TtlCache', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns values before ttl expiry and removes them after expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-22T00:00:00.000Z'));

    const cache = new TtlCache<string, string>();
    cache.set('guild', 'settings', 1_000);

    expect(cache.get('guild')).toBe('settings');

    vi.advanceTimersByTime(1_001);

    expect(cache.get('guild')).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});

describe('AppCache', () => {
  it('prevents duplicate leaderboard lock acquisition', () => {
    const cache = new AppCache();

    expect(cache.acquireLeaderboardLock('guild-id')).toBe(true);
    expect(cache.acquireLeaderboardLock('guild-id')).toBe(false);

    cache.releaseLeaderboardLock('guild-id');

    expect(cache.acquireLeaderboardLock('guild-id')).toBe(true);
  });
});

