import { describe, expect, it, vi } from 'vitest';

import { AppCache } from '../src/cache/cache.js';
import { LeaderboardService } from '../src/modules/leveling/leaderboard.service.js';

describe('LeaderboardService', () => {
  it('builds a leaderboard embed from rank entries and top limit', async () => {
    const service = new LeaderboardService(
      {} as never,
      {
        getLeaderboardPage: vi.fn().mockResolvedValue({
          entries: [{ rank: 1, userId: 'user-1', currentLevel: 5, totalExp: 1234n }]
        })
      } as never
    );

    const embed = await service.buildLeaderboardEmbed('guild-1', 10);
    const data = embed.toJSON();

    expect(data.title).toContain('Leaderboard');
    expect(data.description).toContain('#1 <@user-1> — Level 5 • 1,234 EXP');
  });

  it('prevents parallel updates with the in-memory lock', async () => {
    const cache = new AppCache();
    const service = new LeaderboardService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      cache
    );

    cache.acquireLeaderboardLock('guild-1');
    await expect(service.updateGuildLeaderboard('guild-1', {} as never)).resolves.toBeNull();
  });
});

