import type { GuildSetting, UserLevelStat } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppCache } from '../src/cache/cache.js';
import { MessageValidationService, normalizeMessageContent } from '../src/modules/leveling/validation.service.js';

const now = new Date('2026-05-22T05:00:00.000Z');

function makeSettings(overrides: Partial<GuildSetting> = {}): GuildSetting {
  return {
    guildId: 'guild-1',
    enabled: true,
    minExp: 5,
    maxExp: 10,
    cooldownSeconds: 60,
    dailyExpCap: 500,
    timezone: 'Asia/Jakarta',
    leaderboardEnabled: false,
    leaderboardChannelId: null,
    leaderboardMessageId: null,
    leaderboardTopLimit: 10,
    levelUpChannelId: null,
    levelUpTemplate: null,
    roleRewardMode: 'cumulative',
    allowLinkOnlyExp: false,
    allowEmojiOnlyExp: false,
    allowAttachmentOnlyExp: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function makeStat(overrides: Partial<UserLevelStat> = {}): UserLevelStat {
  return {
    guildId: 'guild-1',
    userId: 'user-1',
    totalExp: 0n,
    currentLevel: 1,
    currentLevelExp: 0n,
    requiredExpToNextLevel: 100n,
    validMessageCount: 0n,
    invalidMessageCount: 0n,
    dailyExp: 0,
    dailyExpDate: null,
    lastExpGainAt: null,
    lastMessageAt: null,
    lastLevelUpAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function baseInput(overrides = {}) {
  return {
    guildId: 'guild-1',
    targetGuildId: 'guild-1',
    userId: 'user-1',
    channelId: 'channel-1',
    content: 'halo semua member',
    isBot: false,
    isWebhook: false,
    isDm: false,
    hasAttachments: false,
    settings: makeSettings(),
    channelRules: [],
    userStat: null,
    now,
    ...overrides
  };
}

describe('MessageValidationService', () => {
  let cache: AppCache;
  let service: MessageValidationService;

  beforeEach(() => {
    cache = new AppCache();
    service = new MessageValidationService(cache);
  });

  it('normalizes content for duplicate detection', () => {
    expect(normalizeMessageContent('Halo     <@123> https://example.com')).toBe(
      'halo <mention> <url>'
    );
  });

  it.each([
    ['BOT_MESSAGE', { isBot: true }],
    ['WEBHOOK_MESSAGE', { isWebhook: true }],
    ['NON_GUILD_MESSAGE', { guildId: null, isDm: true }],
    ['NON_TARGET_GUILD', { guildId: 'other-guild' }],
    ['LEVELING_DISABLED', { settings: makeSettings({ enabled: false }) }],
    ['COMMAND_MESSAGE', { content: '!rank' }],
    ['TOO_SHORT', { content: 'ok' }],
    ['LINK_ONLY', { content: 'https://example.com' }],
    ['EMOJI_ONLY', { content: '😀😀😀' }],
    ['MENTION_ONLY', { content: '<@1234567890>' }],
    ['ATTACHMENT_ONLY', { content: '', hasAttachments: true }],
    ['BLACKLIST_PATTERN', { content: 'qwerty' }],
    ['REPEATED_CHARACTER', { content: 'aaaaaaaaaaaa' }]
  ])('rejects %s', (reasonCode, overrides) => {
    const result = service.validateMessage(baseInput(overrides));

    expect(result.isValid).toBe(false);
    expect(result.reasonCode).toBe(reasonCode);
  });

  it('honors channel allow and ignore rules', () => {
    expect(
      service.validateMessage(
        baseInput({
          channelId: 'channel-2',
          channelRules: [{ channelId: 'channel-1', mode: 'allow' }]
        })
      ).reasonCode
    ).toBe('CHANNEL_NOT_ELIGIBLE');

    expect(
      service.validateMessage(
        baseInput({
          channelId: 'channel-1',
          channelRules: [{ channelId: 'channel-1', mode: 'ignore' }]
        })
      ).reasonCode
    ).toBe('CHANNEL_NOT_ELIGIBLE');
  });

  it('rejects duplicate messages from cache history', () => {
    service.rememberMessage('guild-1', 'user-1', 'halo semua member', now);

    const result = service.validateMessage(baseInput());

    expect(result.reasonCode).toBe('DUPLICATE_MESSAGE');
  });

  it('rejects burst spam after the configured window count', () => {
    let reasonCode: string | undefined;

    for (let i = 0; i < 6; i += 1) {
      reasonCode = service.validateMessage(
        baseInput({ content: `halo semua member ${i}` })
      ).reasonCode;
    }

    expect(reasonCode).toBe('BURST_SPAM');
  });

  it('rejects active cooldown from user stats', () => {
    const result = service.validateMessage(
      baseInput({
        userStat: makeStat({ lastExpGainAt: new Date(now.getTime() - 10_000) })
      })
    );

    expect(result.reasonCode).toBe('COOLDOWN_ACTIVE');
  });

  it('rejects reached daily cap for the same timezone date', () => {
    const result = service.validateMessage(
      baseInput({
        userStat: makeStat({
          dailyExp: 500,
          dailyExpDate: new Date('2026-05-22T00:00:00.000Z')
        })
      })
    );

    expect(result.reasonCode).toBe('DAILY_CAP_REACHED');
  });

  it('allows messages over daily cap when daily cap is disabled', () => {
    const result = service.validateMessage(
      baseInput({
        settings: makeSettings({ dailyExpCap: 0 }),
        userStat: makeStat({
          dailyExp: 500,
          dailyExpDate: new Date('2026-05-22T00:00:00.000Z')
        })
      })
    );

    expect(result.isValid).toBe(true);
  });

  it('accepts a meaningful message', () => {
    const result = service.validateMessage(baseInput());

    expect(result.isValid).toBe(true);
  });
});
