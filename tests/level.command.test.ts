import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recordProfileCheck: vi.fn(),
  getUserProfile: vi.fn(),
  ensureTargetGuild: vi.fn()
}));

vi.mock('../src/commands/guards.js', () => ({
  ensureTargetGuild: mocks.ensureTargetGuild
}));

vi.mock('../src/modules/leveling/rank.service.js', () => ({
  rankService: {
    getUserProfile: mocks.getUserProfile
  }
}));

vi.mock('../src/modules/commands/command-usage.service.js', () => ({
  commandUsageService: {
    recordProfileCheck: mocks.recordProfileCheck
  }
}));

const { levelCommand } = await import('../src/commands/user/rank.command.js');

function createInteraction() {
  return {
    guildId: 'guild-1',
    user: {
      id: 'user-1',
      username: 'UserOne',
      displayAvatarURL: vi.fn(() => 'https://example.com/avatar.png')
    },
    options: {
      getUser: vi.fn(() => null)
    },
    reply: vi.fn()
  };
}

describe('/level cooldown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTargetGuild.mockResolvedValue(true);
    mocks.getUserProfile.mockResolvedValue({
      guildId: 'guild-1',
      userId: 'user-1',
      rank: 1,
      totalExp: 100n,
      currentLevel: 1,
      currentLevelExp: 10n,
      requiredExpToNextLevel: 100n,
      validMessageCount: 1n,
      invalidMessageCount: 0n,
      lastExpGainAt: null,
      lastLevelUpAt: null,
      hasData: true
    });
  });

  it('rate limits repeated /level checks for the same user', async () => {
    const first = createInteraction();
    const second = createInteraction();

    await levelCommand.execute(first as never);
    await levelCommand.execute(second as never);

    expect(mocks.getUserProfile).toHaveBeenCalledOnce();
    expect(mocks.recordProfileCheck).toHaveBeenCalledOnce();
    expect(first.reply).toHaveBeenCalledWith(expect.objectContaining({ embeds: expect.any(Array) }));
    expect(second.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Tunggu'),
        flags: expect.any(Number)
      })
    );
  });
});
