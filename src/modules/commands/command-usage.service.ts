import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';

export type ProfileCheckCommandName = 'level' | 'rank' | 'profile';

export type ProfileCheckStatsRow = {
  userId: string;
  totalCount: number;
  levelCount: number;
  rankCount: number;
  profileCount: number;
  lastUsedAt: Date;
};

function normalizeRawDate(value: Date | string | number | bigint): Date {
  if (value instanceof Date) {
    return value;
  }

  const date = new Date(typeof value === 'bigint' ? Number(value) : value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid command usage timestamp: ${String(value)}`);
  }

  return date;
}

export class CommandUsageService {
  constructor(private readonly database: PrismaClient = prisma) {}

  async recordProfileCheck(input: {
    guildId: string;
    userId: string;
    commandName: ProfileCheckCommandName;
    targetUserId?: string;
  }): Promise<void> {
    try {
      await this.database.commandUsageEvent.create({
        data: {
          guildId: input.guildId,
          userId: input.userId,
          commandName: input.commandName,
          targetUserId: input.targetUserId
        }
      });
    } catch (error) {
      logger.warn(
        {
          err: error,
          guildId: input.guildId,
          userId: input.userId,
          commandName: input.commandName
        },
        'Failed to record command usage event'
      );
    }
  }

  async getProfileCheckStats(guildId: string, limit: number): Promise<ProfileCheckStatsRow[]> {
    const rows = await this.database.$queryRaw<
      Array<{
        user_id: string;
        total_count: bigint;
        level_count: bigint;
        rank_count: bigint;
        profile_count: bigint;
        last_used_at: Date | string | number | bigint;
      }>
    >`
      SELECT
        user_id,
        COUNT(*) AS total_count,
        SUM(CASE WHEN command_name = 'level' THEN 1 ELSE 0 END) AS level_count,
        SUM(CASE WHEN command_name = 'rank' THEN 1 ELSE 0 END) AS rank_count,
        SUM(CASE WHEN command_name = 'profile' THEN 1 ELSE 0 END) AS profile_count,
        MAX(created_at) AS last_used_at
      FROM command_usage_events
      WHERE guild_id = ${guildId}
        AND command_name IN ('level', 'rank', 'profile')
      GROUP BY user_id
      ORDER BY total_count DESC, last_used_at DESC, user_id ASC
      LIMIT ${limit}
    `;

    return rows.map((row) => ({
      userId: row.user_id,
      totalCount: Number(row.total_count),
      levelCount: Number(row.level_count),
      rankCount: Number(row.rank_count),
      profileCount: Number(row.profile_count),
      lastUsedAt: normalizeRawDate(row.last_used_at)
    }));
  }
}

export const commandUsageService = new CommandUsageService();
