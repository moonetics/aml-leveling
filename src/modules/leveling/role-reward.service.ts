import { type Guild, type GuildMember, type Role } from 'discord.js';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../database/prisma.js';
import { logger } from '../../utils/logger.js';
import {
  getHighestEligibleLevelRole,
  STATIC_LEVEL_ROLE_REWARDS,
  type StaticLevelRoleReward
} from './static-level-roles.js';

export type RoleSyncResult = {
  userId: string;
  addedRoleIds: string[];
  removedRoleIds: string[];
  skipped: boolean;
  reason?: string;
};

export class RoleRewardService {
  constructor(
    private readonly database: PrismaClient = prisma,
    private readonly rewards: readonly StaticLevelRoleReward[] = STATIC_LEVEL_ROLE_REWARDS
  ) {}

  async listRewards(): Promise<readonly StaticLevelRoleReward[]> {
    return this.rewards;
  }

  async syncUserRewards(guild: Guild, userId: string): Promise<RoleSyncResult> {
    const stat = await this.database.userLevelStat.findUnique({
      where: { guildId_userId: { guildId: guild.id, userId } }
    });

    if (!stat) {
      return { userId, addedRoleIds: [], removedRoleIds: [], skipped: true, reason: 'NO_STATS' };
    }

    const member = await fetchMember(guild, userId);

    if (!member || member.user.bot) {
      return { userId, addedRoleIds: [], removedRoleIds: [], skipped: true, reason: 'MEMBER_NOT_FOUND' };
    }

    const desiredReward = getHighestEligibleLevelRole(stat.currentLevel, this.rewards);

    if (!desiredReward) {
      return { userId, addedRoleIds: [], removedRoleIds: [], skipped: true, reason: 'NO_ELIGIBLE_ROLE' };
    }

    const rewardRoleIds = new Set(this.rewards.map((reward) => reward.roleId));
    const desiredRoleId = desiredReward.roleId;
    const addedRoleIds: string[] = [];
    const removedRoleIds: string[] = [];

    if (!member.roles.cache.has(desiredRoleId)) {
      const role = await fetchRole(guild, desiredRoleId);
      validateRewardRole(guild, role);
      await member.roles.add(role);
      addedRoleIds.push(desiredRoleId);
    }

    const removable = member.roles.cache.filter(
      (role) => rewardRoleIds.has(role.id) && role.id !== desiredRoleId
    );

    for (const role of removable.values()) {
      await member.roles.remove(role);
      removedRoleIds.push(role.id);
    }

    return {
      userId,
      addedRoleIds,
      removedRoleIds,
      skipped: false
    };
  }

  async syncAllUsersWithStats(guild: Guild): Promise<RoleSyncResult[]> {
    const stats = await this.database.userLevelStat.findMany({
      where: { guildId: guild.id },
      select: { userId: true }
    });
    const results: RoleSyncResult[] = [];

    for (const stat of stats) {
      try {
        results.push(await this.syncUserRewards(guild, stat.userId));
      } catch (error) {
        logger.warn({ err: error, guildId: guild.id, userId: stat.userId }, 'Role sync failed for user');
        results.push({
          userId: stat.userId,
          addedRoleIds: [],
          removedRoleIds: [],
          skipped: true,
          reason: 'SYNC_FAILED'
        });
      }
    }

    return results;
  }
}

async function fetchMember(guild: Guild, userId: string): Promise<GuildMember | null> {
  try {
    return guild.members.cache.get(userId) ?? guild.members.fetch(userId);
  } catch {
    return null;
  }
}

async function fetchRole(guild: Guild, roleId: string): Promise<Role> {
  const role = guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId));

  if (!role) {
    throw new Error('ROLE_NOT_FOUND');
  }

  return role;
}

function validateRewardRole(guild: Guild, role: Role): void {
  const botHighestRole = guild.members.me?.roles.highest;

  if (!botHighestRole || role.position >= botHighestRole.position) {
    throw new Error('ROLE_HIERARCHY_TOO_LOW');
  }
}

export const roleRewardService = new RoleRewardService();
