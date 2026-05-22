import { EmbedBuilder, type GuildTextBasedChannel, type Message } from 'discord.js';

import type { GrantExpResult } from './leveling.types.js';
import type { RoleSyncResult } from './role-reward.service.js';
import { guildSettingsService, type GuildSettingsService } from '../guild-settings/guild-settings.service.js';
import { formatExp } from '../../utils/format.js';
import { logger } from '../../utils/logger.js';

export class NotificationService {
  constructor(private readonly settings: GuildSettingsService = guildSettingsService) {}

  async sendLevelUpNotification(
    message: Message,
    result: GrantExpResult,
    roleSync: RoleSyncResult
  ): Promise<void> {
    try {
      const channel = await this.resolveChannel(message);

      if (!channel) {
        return;
      }

      const rewardsText =
        roleSync.addedRoleIds.length > 0
          ? roleSync.addedRoleIds.map((roleId) => `<@&${roleId}>`).join(', ')
          : '-';
      const embed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setDescription(`<@${message.author.id}> naik dari Level ${result.oldLevel} ke Level ${result.newLevel}.`)
        .setColor(0xeb5757)
        .addFields(
          { name: 'Total EXP', value: formatExp(result.newTotalExp), inline: true },
          { name: 'Reward Baru', value: rewardsText, inline: true }
        );

      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.warn(
        { err: error, guildId: message.guildId, userId: message.author.id },
        'Failed to send level-up notification'
      );
    }
  }

  private async resolveChannel(message: Message): Promise<GuildTextBasedChannel | null> {
    const guild = message.guild;

    if (!guild) {
      return null;
    }

    const settings = await this.settings.ensureGuildSettings(guild.id);

    if (!settings.levelUpChannelId) {
      return null;
    }

      const configuredChannel =
        guild.channels.cache.get(settings.levelUpChannelId) ?? (await guild.channels.fetch(settings.levelUpChannelId));

    if (configuredChannel?.isTextBased() && 'send' in configuredChannel) {
      return configuredChannel as GuildTextBasedChannel;
    }

    throw new Error('LEVEL_UP_HISTORY_CHANNEL_NOT_SENDABLE');
  }
}

export const notificationService = new NotificationService();
