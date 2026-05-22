import type { GuildExpChannel, GuildSetting, PrismaClient } from '@prisma/client';

import { appCache, cacheKeys, cacheTtl, type AppCache } from '../../cache/cache.js';
import { prisma, type TransactionClient } from '../../database/prisma.js';
import { auditService, type AuditService } from '../audit/audit.service.js';
import { buildDefaultGuildSettingsCreateInput } from './default-settings.js';

type GuildSettingsDatabase = PrismaClient | TransactionClient;

export class GuildSettingsService {
  constructor(
    private readonly database: GuildSettingsDatabase = prisma,
    private readonly cache: AppCache = appCache,
    private readonly audit: AuditService = auditService
  ) {}

  async ensureGuildSettings(guildId: string): Promise<GuildSetting> {
    const cacheKey = cacheKeys.guildSettings(guildId);
    const cached = this.cache.guildSettings.get(cacheKey) as GuildSetting | undefined;

    if (cached) {
      return cached;
    }

    const settings = await this.database.guildSetting.upsert({
      where: { guildId },
      update: {},
      create: buildDefaultGuildSettingsCreateInput(guildId)
    });

    this.cache.guildSettings.set(cacheKey, settings, cacheTtl.guildSettingsMs);
    return settings;
  }

  invalidateGuildSettings(guildId: string): void {
    this.cache.guildSettings.delete(cacheKeys.guildSettings(guildId));
  }

  async updateEnabled(guildId: string, actorUserId: string, enabled: boolean): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_ENABLED_UPDATE', { enabled });
  }

  async updateExpRange(
    guildId: string,
    actorUserId: string,
    minExp: number,
    maxExp: number
  ): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_EXP_RANGE_UPDATE', { minExp, maxExp });
  }

  async updateCooldown(guildId: string, actorUserId: string, cooldownSeconds: number): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_COOLDOWN_UPDATE', { cooldownSeconds });
  }

  async updateDailyCap(guildId: string, actorUserId: string, dailyExpCap: number): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_DAILY_CAP_UPDATE', { dailyExpCap });
  }

  async updateTimezone(guildId: string, actorUserId: string, timezone: string): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_TIMEZONE_UPDATE', { timezone });
  }

  async updateLeaderboardConfig(
    guildId: string,
    actorUserId: string,
    data: Partial<Pick<GuildSetting, 'leaderboardEnabled' | 'leaderboardChannelId' | 'leaderboardMessageId'>>
  ): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_LEADERBOARD_UPDATE', data);
  }

  async updateLevelUpChannel(
    guildId: string,
    actorUserId: string,
    levelUpChannelId: string
  ): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_HISTORY_CHANNEL_UPDATE', {
      levelUpChannelId
    });
  }

  async disableLevelUpChannel(guildId: string, actorUserId: string): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_HISTORY_CHANNEL_DISABLE', {
      levelUpChannelId: null
    });
  }

  async updateRoleRewardMode(
    guildId: string,
    actorUserId: string,
    roleRewardMode: 'cumulative' | 'highest_only'
  ): Promise<GuildSetting> {
    return this.updateSettings(guildId, actorUserId, 'LEVELING_ROLE_REWARD_MODE_UPDATE', {
      roleRewardMode
    });
  }

  async addChannelRule(
    guildId: string,
    actorUserId: string,
    channelId: string,
    mode: 'allow' | 'ignore'
  ): Promise<GuildExpChannel> {
    await this.ensureGuildSettings(guildId);

    const existing = await this.database.guildExpChannel.findUnique({
      where: { guildId_channelId_mode: { guildId, channelId, mode } }
    });

    if (existing) {
      return existing;
    }

    const created = await this.database.guildExpChannel.create({
      data: { guildId, channelId, mode, createdBy: actorUserId }
    });

    await this.audit.createAuditLog({
      guildId,
      actorUserId,
      action: `LEVELING_CHANNEL_${mode.toUpperCase()}_ADD`,
      after: created
    });
    this.invalidateGuildSettings(guildId);
    return created;
  }

  async removeChannelRule(
    guildId: string,
    actorUserId: string,
    channelId: string,
    mode: 'allow' | 'ignore'
  ): Promise<boolean> {
    const existing = await this.database.guildExpChannel.findUnique({
      where: { guildId_channelId_mode: { guildId, channelId, mode } }
    });

    if (!existing) {
      return false;
    }

    await this.database.guildExpChannel.delete({
      where: { guildId_channelId_mode: { guildId, channelId, mode } }
    });
    await this.audit.createAuditLog({
      guildId,
      actorUserId,
      action: `LEVELING_CHANNEL_${mode.toUpperCase()}_REMOVE`,
      before: existing
    });
    this.invalidateGuildSettings(guildId);
    return true;
  }

  private async updateSettings(
    guildId: string,
    actorUserId: string,
    action: string,
    data: Partial<
      Pick<
        GuildSetting,
        | 'enabled'
        | 'minExp'
        | 'maxExp'
        | 'cooldownSeconds'
        | 'dailyExpCap'
        | 'timezone'
        | 'leaderboardEnabled'
        | 'leaderboardChannelId'
        | 'leaderboardMessageId'
        | 'levelUpChannelId'
        | 'roleRewardMode'
      >
    >
  ): Promise<GuildSetting> {
    const before = await this.ensureGuildSettings(guildId);
    const after = await this.database.guildSetting.update({
      where: { guildId },
      data
    });

    await this.audit.createAuditLog({
      guildId,
      actorUserId,
      action,
      before,
      after
    });
    this.invalidateGuildSettings(guildId);
    return after;
  }
}

export const guildSettingsService = new GuildSettingsService();
