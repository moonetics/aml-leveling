import type { Message } from 'discord.js';

import { appCache, cacheKeys } from '../cache/cache.js';
import { getEnv } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { guildSettingsService } from '../modules/guild-settings/guild-settings.service.js';
import { expService } from '../modules/leveling/exp.service.js';
import { notificationService } from '../modules/leveling/notification.service.js';
import { roleRewardService } from '../modules/leveling/role-reward.service.js';
import { messageValidationService } from '../modules/leveling/validation.service.js';
import { defaultMemberRoleService } from '../modules/roles/default-member-role.service.js';
import { logger } from '../utils/logger.js';

export async function handleMessageCreate(message: Message): Promise<void> {
  const now = new Date();

  try {
    const env = getEnv();

    if (message.author.bot || message.webhookId || !message.guildId) {
      return;
    }

    if (message.guildId !== env.DISCORD_GUILD_ID) {
      logger.warn(
        { guildId: message.guildId, expectedGuildId: env.DISCORD_GUILD_ID },
        'Ignoring message from non-target guild'
      );
      return;
    }

    if (message.guild) {
      void defaultMemberRoleService.safeEnsureDefaultRoleForUser(message.guild, message.author.id);
    }

    const settings = await guildSettingsService.ensureGuildSettings(message.guildId);
    const [channelRules, userStat] = await Promise.all([
      prisma.guildExpChannel.findMany({
        where: { guildId: message.guildId },
        select: { channelId: true, mode: true }
      }),
      prisma.userLevelStat.findUnique({
        where: { guildId_userId: { guildId: message.guildId, userId: message.author.id } }
      })
    ]);

    const validation = messageValidationService.validateMessage({
      guildId: message.guildId,
      targetGuildId: env.DISCORD_GUILD_ID,
      userId: message.author.id,
      channelId: message.channelId,
      content: message.content,
      isBot: message.author.bot,
      isWebhook: Boolean(message.webhookId),
      isDm: !message.guildId,
      hasAttachments: message.attachments.size > 0,
      settings,
      channelRules,
      userStat,
      now
    });

    if (validation.normalizedContent) {
      messageValidationService.rememberMessage(
        message.guildId,
        message.author.id,
        validation.normalizedContent,
        now
      );
    }

    if (!validation.isValid) {
      if (validation.reasonCode !== 'COOLDOWN_ACTIVE') {
        await expService.recordInvalidMessage(message.guildId, message.author.id, now);
      }
      logger.debug(
        {
          guildId: message.guildId,
          userId: message.author.id,
          reasonCode: validation.reasonCode,
          metadata: validation.metadata
        },
        'Message did not qualify for EXP'
      );
      return;
    }

    const result = await expService.grantChatExp({
      guildId: message.guildId,
      userId: message.author.id,
      messageId: message.id,
      channelId: message.channelId,
      now,
      metadata: validation.metadata
    });

    if (result.granted) {
      appCache.cooldowns.set(
        cacheKeys.userCooldown(message.guildId, message.author.id),
        now,
        settings.cooldownSeconds * 1000
      );
    }

    if (result.granted && message.guild) {
      try {
        const syncResult = await roleRewardService.syncUserRewards(message.guild, message.author.id);

        if (result.levelChanged) {
          await notificationService.sendLevelUpNotification(message, result, syncResult);
        }
      } catch (error) {
        logger.warn(
          { err: error, guildId: message.guildId, userId: message.author.id },
          'Role reward sync failed after EXP grant'
        );
      }
    }
  } catch (error) {
    logger.error(
      {
        err: error,
        guildId: message.guildId,
        channelId: message.channelId,
        messageId: message.id,
        userId: message.author.id
      },
      'Failed to process messageCreate EXP flow'
    );
  }
}
