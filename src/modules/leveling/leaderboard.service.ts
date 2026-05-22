import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type Message,
  type TextBasedChannel
} from 'discord.js';
import type { PrismaClient } from '@prisma/client';

import { appCache, type AppCache } from '../../cache/cache.js';
import { prisma } from '../../database/prisma.js';
import { auditService, type AuditService } from '../audit/audit.service.js';
import { guildSettingsService, type GuildSettingsService } from '../guild-settings/guild-settings.service.js';
import { rankService, type RankService } from './rank.service.js';
import { formatExp } from '../../utils/format.js';
import { logger } from '../../utils/logger.js';

export class LeaderboardService {
  constructor(
    private readonly database: PrismaClient = prisma,
    private readonly rank: RankService = rankService,
    private readonly settings: GuildSettingsService = guildSettingsService,
    private readonly audit: AuditService = auditService,
    private readonly cache: AppCache = appCache
  ) {}

  async configureChannel(
    guildId: string,
    channelId: string,
    actorUserId: string,
    client: Client
  ): Promise<Message | null> {
    await this.settings.updateLeaderboardConfig(guildId, actorUserId, {
      leaderboardEnabled: true,
      leaderboardChannelId: channelId,
      leaderboardMessageId: null
    });

    return this.updateGuildLeaderboard(guildId, client);
  }

  async disable(guildId: string, actorUserId: string, reason = 'disabled'): Promise<void> {
    const before = await this.settings.ensureGuildSettings(guildId);
    const after = await this.database.guildSetting.update({
      where: { guildId },
      data: {
        leaderboardEnabled: false,
        leaderboardChannelId: null,
        leaderboardMessageId: null
      }
    });

    this.settings.invalidateGuildSettings(guildId);
    await this.audit.createAuditLog({
      guildId,
      actorUserId,
      action: 'LEVELING_LEADERBOARD_DISABLE',
      before,
      after,
      reason
    });
  }

  async updateGuildLeaderboard(guildId: string, client: Client): Promise<Message | null> {
    if (!this.cache.acquireLeaderboardLock(guildId)) {
      return null;
    }

    try {
      const settings = await this.settings.ensureGuildSettings(guildId);

      if (!settings.leaderboardEnabled || !settings.leaderboardChannelId) {
        return null;
      }

      const guild = await this.fetchGuild(client, guildId);
      const channel = await this.fetchChannel(guild, settings.leaderboardChannelId);

      if (!channel || !isSendableTextChannel(channel)) {
        await this.disableForSystem(guildId, 'LEADERBOARD_CHANNEL_MISSING');
        return null;
      }

      if (!hasLeaderboardPermissions(channel, guild)) {
        await this.disableForSystem(guildId, 'LEADERBOARD_PERMISSION_MISSING');
        return null;
      }

      const embed = await this.buildLeaderboardEmbed(guildId, settings.leaderboardTopLimit);
      const existingMessage = settings.leaderboardMessageId
        ? await fetchMessage(channel, settings.leaderboardMessageId)
        : null;
      const message = existingMessage
        ? await existingMessage.edit({ embeds: [embed] })
        : await channel.send({ embeds: [embed] });

      if (message.id !== settings.leaderboardMessageId) {
        await this.settings.updateLeaderboardConfig(guildId, 'system', {
          leaderboardEnabled: true,
          leaderboardChannelId: settings.leaderboardChannelId,
          leaderboardMessageId: message.id
        });
      }

      return message;
    } catch (error) {
      logger.error({ err: error, guildId }, 'Failed to update leaderboard');
      return null;
    } finally {
      this.cache.releaseLeaderboardLock(guildId);
    }
  }

  async buildLeaderboardEmbed(guildId: string, topLimit: number): Promise<EmbedBuilder> {
    const page = await this.rank.getLeaderboardPage(guildId, 1, topLimit);
    const description =
      page.entries.length === 0
        ? 'Belum ada user yang memiliki EXP.'
        : page.entries
            .map(
              (entry) =>
                `#${entry.rank} <@${entry.userId}> — Level ${entry.currentLevel} • ${formatExp(entry.totalExp)} EXP`
            )
            .join('\n');

    return new EmbedBuilder()
      .setTitle('🏆 AML Leveling Leaderboard')
      .setDescription(description)
      .setColor(0xf2c94c)
      .setFooter({ text: 'Updated otomatis setiap ±1 menit' })
      .setTimestamp(new Date());
  }

  private async fetchGuild(client: Client, guildId: string): Promise<Guild> {
    return client.guilds.cache.get(guildId) ?? client.guilds.fetch(guildId);
  }

  private async fetchChannel(guild: Guild, channelId: string): Promise<GuildBasedChannel | null> {
    return guild.channels.cache.get(channelId) ?? guild.channels.fetch(channelId);
  }

  private async disableForSystem(guildId: string, reason: string): Promise<void> {
    logger.warn({ guildId, reason }, 'Disabling leaderboard');
    await this.disable(guildId, 'system', reason);
  }
}

function isSendableTextChannel(channel: GuildBasedChannel): channel is GuildBasedChannel & TextBasedChannel {
  return (
    (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
    'send' in channel &&
    typeof channel.send === 'function'
  );
}

function hasLeaderboardPermissions(channel: GuildBasedChannel, guild: Guild): boolean {
  const permissions = channel.permissionsFor(guild.members.me ?? guild.client.user);

  return Boolean(
    permissions?.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory
    ])
  );
}

async function fetchMessage(channel: TextBasedChannel, messageId: string): Promise<Message | null> {
  try {
    return await channel.messages.fetch(messageId);
  } catch {
    return null;
  }
}

export const leaderboardService = new LeaderboardService();

