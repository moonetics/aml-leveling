import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cooldownSet: vi.fn(),
  ensureGuildSettings: vi.fn(),
  findChannelRules: vi.fn(),
  findUserStat: vi.fn(),
  grantChatExp: vi.fn(),
  getEnv: vi.fn(),
  loggerDebug: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
  rememberMessage: vi.fn(),
  sendLevelUpNotification: vi.fn(),
  syncUserRewards: vi.fn(),
  validateMessage: vi.fn()
}));

vi.mock('../src/cache/cache.js', () => ({
  appCache: {
    cooldowns: {
      set: mocks.cooldownSet
    }
  },
  cacheKeys: {
    userCooldown: (guildId: string, userId: string) => `cooldown:${guildId}:${userId}`
  }
}));

vi.mock('../src/config/env.js', () => ({
  getEnv: mocks.getEnv
}));

vi.mock('../src/database/prisma.js', () => ({
  prisma: {
    guildExpChannel: {
      findMany: mocks.findChannelRules
    },
    userLevelStat: {
      findUnique: mocks.findUserStat
    }
  }
}));

vi.mock('../src/modules/guild-settings/guild-settings.service.js', () => ({
  guildSettingsService: {
    ensureGuildSettings: mocks.ensureGuildSettings
  }
}));

vi.mock('../src/modules/leveling/exp.service.js', () => ({
  expService: {
    grantChatExp: mocks.grantChatExp,
    recordInvalidMessage: vi.fn()
  }
}));

vi.mock('../src/modules/leveling/notification.service.js', () => ({
  notificationService: {
    sendLevelUpNotification: mocks.sendLevelUpNotification
  }
}));

vi.mock('../src/modules/leveling/role-reward.service.js', () => ({
  roleRewardService: {
    syncUserRewards: mocks.syncUserRewards
  }
}));

vi.mock('../src/modules/leveling/validation.service.js', () => ({
  messageValidationService: {
    rememberMessage: mocks.rememberMessage,
    validateMessage: mocks.validateMessage
  }
}));

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    debug: mocks.loggerDebug,
    error: mocks.loggerError,
    warn: mocks.loggerWarn
  }
}));

const { handleMessageCreate } = await import('../src/events/message-create.event.js');

function createMessage() {
  return {
    id: 'message-1',
    guildId: 'guild-1',
    channelId: 'channel-1',
    content: 'hello world',
    webhookId: null,
    author: {
      bot: false,
      id: 'user-1'
    },
    attachments: {
      size: 0
    },
    guild: {
      id: 'guild-1'
    }
  };
}

describe('handleMessageCreate role sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEnv.mockReturnValue({
      DISCORD_GUILD_ID: 'guild-1'
    });
    mocks.ensureGuildSettings.mockResolvedValue({
      cooldownSeconds: 20
    });
    mocks.findChannelRules.mockResolvedValue([]);
    mocks.findUserStat.mockResolvedValue(null);
    mocks.validateMessage.mockReturnValue({
      isValid: true,
      normalizedContent: 'hello world',
      metadata: { contentLength: 11 }
    });
    mocks.grantChatExp.mockResolvedValue({
      granted: true,
      levelChanged: false
    });
    mocks.syncUserRewards.mockResolvedValue({
      userId: 'user-1',
      addedRoleIds: ['role-1-2'],
      removedRoleIds: [],
      skipped: false
    });
  });

  it('syncs reward roles after valid EXP even when the user does not level up', async () => {
    await handleMessageCreate(createMessage() as never);

    expect(mocks.syncUserRewards).toHaveBeenCalledWith({ id: 'guild-1' }, 'user-1');
    expect(mocks.sendLevelUpNotification).not.toHaveBeenCalled();
  });

  it('still sends level-up notification when a valid EXP grant changes level', async () => {
    mocks.grantChatExp.mockResolvedValue({
      granted: true,
      levelChanged: true
    });

    const message = createMessage();
    await handleMessageCreate(message as never);

    expect(mocks.syncUserRewards).toHaveBeenCalledWith(message.guild, 'user-1');
    expect(mocks.sendLevelUpNotification).toHaveBeenCalledOnce();
  });
});
