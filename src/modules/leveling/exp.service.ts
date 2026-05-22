import type { GuildSetting, PrismaClient, UserLevelStat } from '@prisma/client';

import { prisma, type TransactionClient } from '../../database/prisma.js';
import { expTransactionQueue, type TransactionQueue } from '../../database/transaction-queue.js';
import { dateKeyToUtcDate, getDateKeyInTimezone, isSameDateInTimezone } from '../../utils/time.js';
import { buildDefaultGuildSettingsCreateInput } from '../guild-settings/default-settings.js';
import { levelFormulaService, type LevelFormulaService } from './level-formula.js';
import type { GrantChatExpInput, GrantExpResult, ManualExpInput, SetExpInput } from './leveling.types.js';

type ExpDatabase = PrismaClient;
type RandomInt = (min: number, max: number) => number;

const DEFAULT_NOW = () => new Date();

function defaultRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function serializeMetadata(metadata: Record<string, unknown> | undefined): string | undefined {
  return metadata ? JSON.stringify(metadata) : undefined;
}

export class ExpService {
  constructor(
    private readonly database: ExpDatabase = prisma,
    private readonly formula: LevelFormulaService = levelFormulaService,
    private readonly randomInt: RandomInt = defaultRandomInt,
    private readonly transactionQueue: TransactionQueue = expTransactionQueue
  ) {}

  async grantChatExp(input: GrantChatExpInput): Promise<GrantExpResult> {
    const now = input.now ?? DEFAULT_NOW();

    return this.runQueuedTransaction(async (tx) => {
      const settings = await this.ensureGuildSettings(tx, input.guildId);
      const stat = await this.getOrCreateUserStat(tx, input.guildId, input.userId, now);
      const dailyState = this.getDailyState(stat, settings, now);
      const dailyCapEnabled = settings.dailyExpCap > 0;

      if (dailyCapEnabled && dailyState.dailyExp >= settings.dailyExpCap) {
        const updatedStat = await tx.userLevelStat.update({
          where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
          data: {
            dailyExp: dailyState.dailyExp,
            dailyExpDate: dailyState.dailyExpDate,
            lastMessageAt: now
          }
        });

        return this.buildResult({
          granted: false,
          source: 'chat',
          amount: 0,
          oldStat: stat,
          newStat: updatedStat,
          dailyCapReached: true,
          dailyExpBefore: dailyState.dailyExp,
          dailyExpAfter: dailyState.dailyExp,
          reasonCode: 'DAILY_CAP_REACHED'
        });
      }

      const randomExp = this.randomInt(settings.minExp, settings.maxExp);
      const remainingCap = dailyCapEnabled ? Math.max(0, settings.dailyExpCap - dailyState.dailyExp) : randomExp;
      const finalExp = dailyCapEnabled ? Math.min(randomExp, remainingCap) : randomExp;
      const newTotalExp = stat.totalExp + BigInt(finalExp);
      const levelResult = this.formula.calculateLevel(newTotalExp);
      const didLevelUp = levelResult.level > stat.currentLevel;

      const updatedStat = await tx.userLevelStat.update({
        where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
        data: {
          totalExp: newTotalExp,
          currentLevel: levelResult.level,
          currentLevelExp: levelResult.currentLevelExp,
          requiredExpToNextLevel: levelResult.requiredExpToNextLevel,
          validMessageCount: { increment: 1 },
          dailyExp: dailyState.dailyExp + finalExp,
          dailyExpDate: dailyState.dailyExpDate,
          lastExpGainAt: now,
          lastMessageAt: now,
          lastLevelUpAt: didLevelUp ? now : stat.lastLevelUpAt
        }
      });

      await tx.expEvent.create({
        data: {
          guildId: input.guildId,
          userId: input.userId,
          source: 'chat',
          amount: finalExp,
          oldTotalExp: stat.totalExp,
          newTotalExp,
          oldLevel: stat.currentLevel,
          newLevel: levelResult.level,
          reasonCode: 'CHAT_EXP',
          messageId: input.messageId,
          channelId: input.channelId,
          metadata: serializeMetadata(input.metadata)
        }
      });

      return this.buildResult({
        granted: finalExp > 0,
        source: 'chat',
        amount: finalExp,
        oldStat: stat,
        newStat: updatedStat,
        dailyCapReached: dailyCapEnabled && dailyState.dailyExp + finalExp >= settings.dailyExpCap,
        dailyExpBefore: dailyState.dailyExp,
        dailyExpAfter: dailyState.dailyExp + finalExp
      });
    });
  }

  async addManualExp(input: ManualExpInput): Promise<GrantExpResult> {
    return this.applyManualExp(input, 'add');
  }

  async removeManualExp(input: ManualExpInput): Promise<GrantExpResult> {
    return this.applyManualExp(input, 'remove');
  }

  async setManualExp(input: SetExpInput): Promise<GrantExpResult> {
    return this.applyManualExp(input, 'set');
  }

  async recordInvalidMessage(guildId: string, userId: string, now = DEFAULT_NOW()): Promise<void> {
    await this.runQueuedTransaction(async (tx) => {
      await this.ensureGuildSettings(tx, guildId);
      await this.getOrCreateUserStat(tx, guildId, userId, now);
      await tx.userLevelStat.update({
        where: { guildId_userId: { guildId, userId } },
        data: {
          invalidMessageCount: { increment: 1 },
          lastMessageAt: now
        }
      });
    });
  }

  private async applyManualExp(input: ManualExpInput | SetExpInput, operation: 'add' | 'remove' | 'set') {
    const now = input.now ?? DEFAULT_NOW();

    return this.runQueuedTransaction(async (tx) => {
      await this.ensureGuildSettings(tx, input.guildId);
      const stat = await this.getOrCreateUserStat(tx, input.guildId, input.userId, now);
      const oldTotalExp = stat.totalExp;
      const signedAmount =
        operation === 'set'
          ? Math.max(0, input.amount) - Number(oldTotalExp)
          : operation === 'remove'
            ? -Math.abs(input.amount)
            : Math.abs(input.amount);
      const newTotalExp =
        operation === 'set'
          ? BigInt(Math.max(0, input.amount))
          : oldTotalExp + BigInt(signedAmount) < 0n
            ? 0n
            : oldTotalExp + BigInt(signedAmount);
      const levelResult = this.formula.calculateLevel(newTotalExp);

      const updatedStat = await tx.userLevelStat.update({
        where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
        data: {
          totalExp: newTotalExp,
          currentLevel: levelResult.level,
          currentLevelExp: levelResult.currentLevelExp,
          requiredExpToNextLevel: levelResult.requiredExpToNextLevel,
          lastLevelUpAt: levelResult.level > stat.currentLevel ? now : stat.lastLevelUpAt
        }
      });

      await tx.expEvent.create({
        data: {
          guildId: input.guildId,
          userId: input.userId,
          source: 'manual',
          amount: Number(newTotalExp - oldTotalExp),
          oldTotalExp,
          newTotalExp,
          oldLevel: stat.currentLevel,
          newLevel: levelResult.level,
          reasonCode: input.reason ?? `MANUAL_EXP_${operation.toUpperCase()}`,
          actorUserId: input.actorUserId,
          metadata: serializeMetadata(input.metadata)
        }
      });

      return this.buildResult({
        granted: newTotalExp !== oldTotalExp,
        source: 'manual',
        amount: Number(newTotalExp - oldTotalExp),
        oldStat: stat,
        newStat: updatedStat,
        dailyCapReached: false,
        dailyExpBefore: stat.dailyExp,
        dailyExpAfter: stat.dailyExp
      });
    });
  }

  private async ensureGuildSettings(tx: TransactionClient, guildId: string): Promise<GuildSetting> {
    return tx.guildSetting.upsert({
      where: { guildId },
      update: {},
      create: buildDefaultGuildSettingsCreateInput(guildId)
    });
  }

  private runQueuedTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return this.transactionQueue.run(() =>
      this.database.$transaction(callback, {
        maxWait: 20_000,
        timeout: 20_000
      })
    );
  }

  private async getOrCreateUserStat(
    tx: TransactionClient,
    guildId: string,
    userId: string,
    now: Date
  ): Promise<UserLevelStat> {
    return tx.userLevelStat.upsert({
      where: { guildId_userId: { guildId, userId } },
      update: {},
      create: {
        guildId,
        userId,
        totalExp: 0n,
        currentLevel: 1,
        currentLevelExp: 0n,
        requiredExpToNextLevel: this.formula.getRequiredExpForNextLevel(1),
        dailyExp: 0,
        dailyExpDate: dateKeyToUtcDate(getDateKeyInTimezone(now, 'Asia/Jakarta'))
      }
    });
  }

  private getDailyState(stat: UserLevelStat, settings: GuildSetting, now: Date) {
    const todayKey = getDateKeyInTimezone(now, settings.timezone);
    const dailyExpDate = dateKeyToUtcDate(todayKey);

    if (!isSameDateInTimezone(stat.dailyExpDate, now, settings.timezone)) {
      return {
        dailyExp: 0,
        dailyExpDate
      };
    }

    return {
      dailyExp: stat.dailyExp,
      dailyExpDate: stat.dailyExpDate ?? dailyExpDate
    };
  }

  private buildResult(input: {
    granted: boolean;
    source: 'chat' | 'manual';
    amount: number;
    oldStat: UserLevelStat;
    newStat: UserLevelStat;
    dailyCapReached: boolean;
    dailyExpBefore: number;
    dailyExpAfter: number;
    reasonCode?: string;
  }): GrantExpResult {
    return {
      granted: input.granted,
      source: input.source,
      amount: input.amount,
      oldTotalExp: input.oldStat.totalExp,
      newTotalExp: input.newStat.totalExp,
      oldLevel: input.oldStat.currentLevel,
      newLevel: input.newStat.currentLevel,
      levelChanged: input.oldStat.currentLevel !== input.newStat.currentLevel,
      dailyCapReached: input.dailyCapReached,
      dailyExpBefore: input.dailyExpBefore,
      dailyExpAfter: input.dailyExpAfter,
      reasonCode: input.reasonCode,
      stat: input.newStat
    };
  }
}

export const expService = new ExpService();
