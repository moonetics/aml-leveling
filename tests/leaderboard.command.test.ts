import { MessageFlags, PermissionsBitField } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { leaderboardCommand } from '../src/commands/user/leaderboard.command.js';
import { resetEnvCacheForTests } from '../src/config/env.js';
import { rankService } from '../src/modules/leveling/rank.service.js';

function createInteraction(overrides: Record<string, unknown> = {}) {
  return {
    guildId: 'guild-1',
    memberPermissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild),
    options: {
      getInteger: vi.fn(() => 1)
    },
    reply: vi.fn(),
    ...overrides
  } as never;
}

describe('/leaderboard command', () => {
  beforeEach(() => {
    process.env.DISCORD_TOKEN = 'token';
    process.env.DISCORD_CLIENT_ID = 'client-id';
    process.env.DISCORD_GUILD_ID = 'guild-1';
    process.env.DATABASE_URL = 'file:./dev.db';
    resetEnvCacheForTests();
    vi.restoreAllMocks();
  });

  it('rejects non-admin users with an ephemeral response', async () => {
    const interaction = createInteraction({
      memberPermissions: new PermissionsBitField(0n)
    });

    await leaderboardCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral })
    );
  });

  it('rejects wrong guild with an ephemeral response', async () => {
    const interaction = createInteraction({ guildId: 'other-guild' });

    await leaderboardCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral })
    );
  });

  it('returns leaderboard embed as an ephemeral admin response', async () => {
    vi.spyOn(rankService, 'getLeaderboardPage').mockResolvedValue({
      page: 1,
      pageSize: 10,
      totalUsers: 1,
      totalPages: 1,
      entries: [{ userId: 'user-1', rank: 1, totalExp: 100n, currentLevel: 2 }]
    });
    const interaction = createInteraction();

    await leaderboardCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: MessageFlags.Ephemeral
      })
    );
  });
});
