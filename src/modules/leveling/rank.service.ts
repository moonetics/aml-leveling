import type { PrismaClient, UserLevelStat } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { levelFormulaService, type LevelFormulaService } from './level-formula.js';
import { STATIC_LEVEL_ROLE_REWARDS, type StaticLevelRoleReward } from './static-level-roles.js';

export type UserLevelProfile = {
  guildId: string;
  userId: string;
  rank: number | null;
  totalExp: bigint;
  currentLevel: number;
  currentLevelExp: bigint;
  requiredExpToNextLevel: bigint;
  validMessageCount: bigint;
  invalidMessageCount: bigint;
  lastExpGainAt: Date | null;
  lastLevelUpAt: Date | null;
  hasData: boolean;
};

export type LeaderboardEntry = {
  userId: string;
  rank: number;
  totalExp: bigint;
  currentLevel: number;
};

export type LeaderboardPage = {
  page: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
  entries: LeaderboardEntry[];
};

export class RankService {
  constructor(
    private readonly database: PrismaClient = prisma,
    private readonly formula: LevelFormulaService = levelFormulaService
  ) {}

  async getUserProfile(guildId: string, userId: string): Promise<UserLevelProfile> {
    const [stat, rank] = await Promise.all([
      this.database.userLevelStat.findUnique({
        where: { guildId_userId: { guildId, userId } }
      }),
      this.getUserRank(guildId, userId)
    ]);

    if (!stat) {
      const level = this.formula.calculateLevel(0);

      return {
        guildId,
        userId,
        rank,
        totalExp: 0n,
        currentLevel: 1,
        currentLevelExp: 0n,
        requiredExpToNextLevel: level.requiredExpToNextLevel,
        validMessageCount: 0n,
        invalidMessageCount: 0n,
        lastExpGainAt: null,
        lastLevelUpAt: null,
        hasData: false
      };
    }

    return this.mapStatToProfile(stat, rank);
  }

  async getUserRank(guildId: string, userId: string): Promise<number | null> {
    const rows = await this.database.$queryRaw<{ user_id: string; rank_position: bigint }[]>`
      SELECT user_id, rank_position
      FROM (
        SELECT
          user_id,
          ROW_NUMBER() OVER (
            ORDER BY current_level DESC, total_exp DESC, updated_at ASC, user_id ASC
          ) AS rank_position
        FROM user_level_stats
        WHERE guild_id = ${guildId}
      ) ranked
      WHERE user_id = ${userId}
    `;

    const row = rows[0];
    return row ? Number(row.rank_position) : null;
  }

  async getLeaderboardPage(guildId: string, page: number, pageSize = 10): Promise<LeaderboardPage> {
    const safePage = Math.max(1, Math.floor(page));
    const totalUsers = await this.database.userLevelStat.count({ where: { guildId } });
    const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
    const boundedPage = Math.min(safePage, totalPages);
    const offset = (boundedPage - 1) * pageSize;
    const stats = await this.database.userLevelStat.findMany({
      where: { guildId },
      orderBy: [
        { currentLevel: 'desc' },
        { totalExp: 'desc' },
        { updatedAt: 'asc' },
        { userId: 'asc' }
      ],
      skip: offset,
      take: pageSize
    });

    return {
      page: boundedPage,
      pageSize,
      totalUsers,
      totalPages,
      entries: stats.map((stat, index) => ({
        userId: stat.userId,
        rank: offset + index + 1,
        totalExp: stat.totalExp,
        currentLevel: stat.currentLevel
      }))
    };
  }

  async getActiveRewards(guildId: string): Promise<readonly StaticLevelRoleReward[]> {
    void guildId;
    return STATIC_LEVEL_ROLE_REWARDS;
  }

  private mapStatToProfile(stat: UserLevelStat, rank: number | null): UserLevelProfile {
    return {
      guildId: stat.guildId,
      userId: stat.userId,
      rank,
      totalExp: stat.totalExp,
      currentLevel: stat.currentLevel,
      currentLevelExp: stat.currentLevelExp,
      requiredExpToNextLevel: stat.requiredExpToNextLevel,
      validMessageCount: stat.validMessageCount,
      invalidMessageCount: stat.invalidMessageCount,
      lastExpGainAt: stat.lastExpGainAt,
      lastLevelUpAt: stat.lastLevelUpAt,
      hasData: true
    };
  }
}

export const rankService = new RankService();
