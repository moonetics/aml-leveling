import type { AuditLog, ExpEvent, PrismaClient, UserLevelStat } from '@prisma/client';
import type { Guild } from 'discord.js';

import { prisma } from '../../database/prisma.js';
import { serializeAuditValue, auditService, type AuditService } from '../audit/audit.service.js';
import { buildDefaultGuildSettingsCreateInput } from '../guild-settings/default-settings.js';
import { expService, type ExpService } from '../leveling/exp.service.js';
import { levelFormulaService, type LevelFormulaService } from '../leveling/level-formula.js';
import { roleRewardService, type RoleRewardService } from '../leveling/role-reward.service.js';
import type { GrantExpResult } from '../leveling/leveling.types.js';
import { logger } from '../../utils/logger.js';

export const RESET_ALL_CONFIRM_TEXT = 'RESET AML LEVELING';

type ManualOperation = 'add' | 'remove' | 'set';

type ManualExpWithAuditInput = {
  guildId: string;
  userId: string;
  amount: number;
  actorUserId: string;
  reason?: string;
  guild?: Guild;
};

type ResetInput = {
  guildId: string;
  actorUserId: string;
  reason?: string;
};

type ResetUserInput = ResetInput & {
  userId: string;
};

type ResetAllInput = ResetInput & {
  confirmText: string;
};

export type AdminOperationExpResult = {
  exp: GrantExpResult;
  roleSyncFailed: boolean;
};

export type ResetUserResult = {
  before: UserLevelStat | null;
  after: UserLevelStat;
};

export type ResetAllResult = {
  deletedUserStats: number;
  deletedExpEvents: number;
  deletedInvalidMessageEvents: number;
};

export type AdminLogEntry = {
  id: string;
  type: 'audit' | 'exp';
  createdAt: Date;
  actorUserId: string | null;
  targetUserId: string | null;
  userId: string | null;
  action: string;
  amount: number | null;
  reason: string | null;
  before?: string | null;
  after?: string | null;
  oldTotalExp?: bigint;
  newTotalExp?: bigint;
  oldLevel?: number;
  newLevel?: number;
};

export type AdminLogsResult = {
  entries: AdminLogEntry[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

function statSnapshot(stat: UserLevelStat | null): Record<string, unknown> | null {
  if (!stat) {
    return null;
  }

  return {
    guildId: stat.guildId,
    userId: stat.userId,
    totalExp: stat.totalExp,
    currentLevel: stat.currentLevel,
    currentLevelExp: stat.currentLevelExp,
    requiredExpToNextLevel: stat.requiredExpToNextLevel,
    validMessageCount: stat.validMessageCount,
    invalidMessageCount: stat.invalidMessageCount,
    dailyExp: stat.dailyExp,
    dailyExpDate: stat.dailyExpDate,
    lastExpGainAt: stat.lastExpGainAt,
    lastMessageAt: stat.lastMessageAt,
    lastLevelUpAt: stat.lastLevelUpAt
  };
}

function resultSnapshot(result: GrantExpResult): Record<string, unknown> {
  return {
    totalExp: result.newTotalExp,
    currentLevel: result.newLevel,
    currentLevelExp: result.stat.currentLevelExp,
    requiredExpToNextLevel: result.stat.requiredExpToNextLevel,
    amountChanged: result.amount,
    levelChanged: result.levelChanged
  };
}

function clampPage(value: number): number {
  return Math.max(1, Math.floor(value));
}

function clampLimit(value: number): number {
  return Math.max(1, Math.min(25, Math.floor(value)));
}

export class AdminOperationsService {
  constructor(
    private readonly database: PrismaClient = prisma,
    private readonly exp: ExpService = expService,
    private readonly audit: AuditService = auditService,
    private readonly roles: RoleRewardService = roleRewardService,
    private readonly formula: LevelFormulaService = levelFormulaService
  ) {}

  async addManualExpWithAudit(input: ManualExpWithAuditInput): Promise<AdminOperationExpResult> {
    return this.applyManualExpWithAudit(input, 'add');
  }

  async removeManualExpWithAudit(input: ManualExpWithAuditInput): Promise<AdminOperationExpResult> {
    return this.applyManualExpWithAudit(input, 'remove');
  }

  async setManualExpWithAudit(input: ManualExpWithAuditInput): Promise<AdminOperationExpResult> {
    return this.applyManualExpWithAudit(input, 'set');
  }

  async resetUser(input: ResetUserInput): Promise<ResetUserResult> {
    const after = await this.database.$transaction(async (tx) => {
      await tx.guildSetting.upsert({
        where: { guildId: input.guildId },
        update: {},
        create: buildDefaultGuildSettingsCreateInput(input.guildId)
      });

      const before = await tx.userLevelStat.findUnique({
        where: { guildId_userId: { guildId: input.guildId, userId: input.userId } }
      });
      const resetData = {
        totalExp: 0n,
        currentLevel: 1,
        currentLevelExp: 0n,
        requiredExpToNextLevel: this.formula.getRequiredExpForNextLevel(1),
        validMessageCount: 0n,
        invalidMessageCount: 0n,
        dailyExp: 0,
        dailyExpDate: null,
        lastExpGainAt: null,
        lastMessageAt: null,
        lastLevelUpAt: null
      };
      const updated = await tx.userLevelStat.upsert({
        where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
        update: resetData,
        create: {
          guildId: input.guildId,
          userId: input.userId,
          ...resetData
        }
      });

      await tx.auditLog.create({
        data: {
          guildId: input.guildId,
          actorUserId: input.actorUserId,
          action: 'reset.user',
          targetUserId: input.userId,
          before: serializeAuditValue(statSnapshot(before)),
          after: serializeAuditValue(statSnapshot(updated)),
          reason: input.reason
        }
      });

      return { before, after: updated };
    });

    return after;
  }

  async resetAll(input: ResetAllInput): Promise<ResetAllResult> {
    if (input.confirmText !== RESET_ALL_CONFIRM_TEXT) {
      throw new Error('RESET_CONFIRMATION_MISMATCH');
    }

    return this.database.$transaction(async (tx) => {
      await tx.guildSetting.upsert({
        where: { guildId: input.guildId },
        update: {},
        create: buildDefaultGuildSettingsCreateInput(input.guildId)
      });

      const [deletedInvalidMessages, deletedExpEvents, deletedUserStats] = await Promise.all([
        tx.invalidMessageEvent.deleteMany({ where: { guildId: input.guildId } }),
        tx.expEvent.deleteMany({ where: { guildId: input.guildId } }),
        tx.userLevelStat.deleteMany({ where: { guildId: input.guildId } })
      ]);
      const result = {
        deletedUserStats: deletedUserStats.count,
        deletedExpEvents: deletedExpEvents.count,
        deletedInvalidMessageEvents: deletedInvalidMessages.count
      };

      await tx.auditLog.create({
        data: {
          guildId: input.guildId,
          actorUserId: input.actorUserId,
          action: 'reset.all',
          before: serializeAuditValue(result),
          after: serializeAuditValue({
            deletedUserStats: 0,
            deletedExpEvents: 0,
            deletedInvalidMessageEvents: 0
          }),
          reason: input.reason
        }
      });

      return result;
    });
  }

  async getAdminLogs(input: {
    guildId: string;
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<AdminLogsResult> {
    const page = clampPage(input.page ?? 1);
    const limit = clampLimit(input.limit ?? 10);
    const userFilter = input.userId;
    const auditWhere = userFilter
      ? {
          guildId: input.guildId,
          OR: [{ actorUserId: userFilter }, { targetUserId: userFilter }]
        }
      : { guildId: input.guildId };
    const expWhere = userFilter
      ? {
          guildId: input.guildId,
          OR: [{ userId: userFilter }, { actorUserId: userFilter }]
        }
      : { guildId: input.guildId };
    const [auditLogs, expEvents, auditCount, expCount] = await Promise.all([
      this.database.auditLog.findMany({ where: auditWhere }),
      this.database.expEvent.findMany({ where: expWhere }),
      this.database.auditLog.count({ where: auditWhere }),
      this.database.expEvent.count({ where: expWhere })
    ]);
    const entries = [...auditLogs.map(toAuditEntry), ...expEvents.map(toExpEntry)].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id)
    );
    const totalCount = auditCount + expCount;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const start = (page - 1) * limit;

    return {
      entries: entries.slice(start, start + limit),
      page,
      limit,
      totalCount,
      totalPages
    };
  }

  private async applyManualExpWithAudit(
    input: ManualExpWithAuditInput,
    operation: ManualOperation
  ): Promise<AdminOperationExpResult> {
    const before = await this.database.userLevelStat.findUnique({
      where: { guildId_userId: { guildId: input.guildId, userId: input.userId } }
    });
    const expInput = {
      guildId: input.guildId,
      userId: input.userId,
      amount: input.amount,
      actorUserId: input.actorUserId,
      reason: input.reason,
      metadata: { adminOperation: operation }
    };
    const result =
      operation === 'add'
        ? await this.exp.addManualExp(expInput)
        : operation === 'remove'
          ? await this.exp.removeManualExp(expInput)
          : await this.exp.setManualExp(expInput);

    await this.audit.createAuditLog({
      guildId: input.guildId,
      actorUserId: input.actorUserId,
      action: `exp.${operation}`,
      targetUserId: input.userId,
      before: statSnapshot(before),
      after: resultSnapshot(result),
      reason: input.reason
    });

    let roleSyncFailed = false;

    if (input.guild) {
      try {
        await this.roles.syncUserRewards(input.guild, input.userId);
      } catch (error) {
        roleSyncFailed = true;
        logger.warn({ err: error, guildId: input.guildId, userId: input.userId }, 'Manual EXP role sync failed');
      }
    }

    return { exp: result, roleSyncFailed };
  }
}

function toAuditEntry(log: AuditLog): AdminLogEntry {
  return {
    id: log.id,
    type: 'audit',
    createdAt: log.createdAt,
    actorUserId: log.actorUserId,
    targetUserId: log.targetUserId,
    userId: null,
    action: log.action,
    amount: null,
    reason: log.reason,
    before: log.before,
    after: log.after
  };
}

function toExpEntry(event: ExpEvent): AdminLogEntry {
  return {
    id: event.id,
    type: 'exp',
    createdAt: event.createdAt,
    actorUserId: event.actorUserId,
    targetUserId: null,
    userId: event.userId,
    action: `${event.source}${event.reasonCode ? `:${event.reasonCode}` : ''}`,
    amount: event.amount,
    reason: event.reasonCode,
    oldTotalExp: event.oldTotalExp,
    newTotalExp: event.newTotalExp,
    oldLevel: event.oldLevel,
    newLevel: event.newLevel
  };
}

export const adminOperationsService = new AdminOperationsService();
