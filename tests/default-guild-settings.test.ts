import { describe, expect, it } from 'vitest';

import {
  buildDefaultGuildSettingsCreateInput,
  DEFAULT_GUILD_SETTINGS
} from '../src/modules/guild-settings/default-settings.js';

describe('DEFAULT_GUILD_SETTINGS', () => {
  it('matches the PRD default configuration for Phase 1', () => {
    expect(DEFAULT_GUILD_SETTINGS).toMatchObject({
      enabled: true,
      minExp: 5,
      maxExp: 10,
      cooldownSeconds: 30,
      dailyExpCap: 500,
      timezone: 'Asia/Jakarta',
      leaderboardEnabled: false,
      leaderboardTopLimit: 10,
      roleRewardMode: 'cumulative',
      allowLinkOnlyExp: false,
      allowEmojiOnlyExp: false,
      allowAttachmentOnlyExp: false
    });
  });

  it('builds a default create input with the guild id', () => {
    expect(buildDefaultGuildSettingsCreateInput('123')).toMatchObject({
      guildId: '123',
      enabled: true,
      timezone: 'Asia/Jakarta'
    });
  });
});
