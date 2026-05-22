import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminOperationsService,
  RESET_ALL_CONFIRM_TEXT
} from '../src/modules/admin/admin-operations.service.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { ExpService } from '../src/modules/leveling/exp.service.js';
import { LevelFormulaService } from '../src/modules/leveling/level-formula.js';
import type { RoleRewardService } from '../src/modules/leveling/role-reward.service.js';

const databaseUrl = 'file:./test-admin-operations.db';
const databasePath = join(process.cwd(), 'prisma', 'test-admin-operations.db');

describe('AdminOperationsService', () => {
  let prisma: PrismaClient;
  let syncUserRewards: ReturnType<typeof vi.fn>;
  let service: AdminOperationsService;

  beforeAll(() => {
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }

    execFileSync('npx prisma db push --schema prisma/schema.prisma --force-reset --skip-generate', {
      env: { ...process.env, DATABASE_URL: databaseUrl, RUST_LOG: 'debug' },
      shell: true,
      stdio: 'pipe'
    });

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.invalidMessageEvent.deleteMany();
    await prisma.expEvent.deleteMany();
    await prisma.roleReward.deleteMany();
    await prisma.userLevelStat.deleteMany();
    await prisma.guildSetting.deleteMany();
    syncUserRewards = vi.fn().mockResolvedValue({
      userId: 'user-1',
      addedRoleIds: [],
      removedRoleIds: [],
      skipped: false
    });
    service = new AdminOperationsService(
      prisma,
      new ExpService(prisma, new LevelFormulaService(), () => 10),
      new AuditService(prisma),
      { syncUserRewards } as unknown as RoleRewardService
    );
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it('adds manual EXP, writes audit JSON safely, and triggers role sync', async () => {
    const result = await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 150,
      actorUserId: 'admin-1',
      reason: 'bonus',
      guild: { id: 'guild-1' } as never
    });
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'exp.add' } });

    expect(result.exp.newTotalExp).toBe(150n);
    expect(await prisma.expEvent.count()).toBe(1);
    expect(syncUserRewards).toHaveBeenCalledWith({ id: 'guild-1' }, 'user-1');
    expect(JSON.parse(audit.after ?? '{}')).toMatchObject({
      totalExp: '150',
      currentLevel: 2,
      amountChanged: 150
    });
  });

  it('removes manual EXP with zero clamp and writes audit', async () => {
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 50,
      actorUserId: 'admin-1'
    });
    const result = await service.removeManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 999,
      actorUserId: 'admin-1'
    });

    expect(result.exp.newTotalExp).toBe(0n);
    expect(result.exp.newLevel).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'exp.remove' } })).toBe(1);
  });

  it('resets one user to default stats and keeps EXP history', async () => {
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 500,
      actorUserId: 'admin-1'
    });

    const result = await service.resetUser({
      guildId: 'guild-1',
      userId: 'user-1',
      actorUserId: 'admin-1',
      reason: 'reset requested'
    });

    expect(result.before?.totalExp).toBe(500n);
    expect(result.after.totalExp).toBe(0n);
    expect(result.after.currentLevel).toBe(1);
    expect(await prisma.expEvent.count()).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'reset.user' } })).toBe(1);
  });

  it('rejects reset all when confirmation text is wrong', async () => {
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 100,
      actorUserId: 'admin-1'
    });

    await expect(
      service.resetAll({
        guildId: 'guild-1',
        actorUserId: 'admin-1',
        confirmText: 'RESET'
      })
    ).rejects.toThrow('RESET_CONFIRMATION_MISMATCH');
    expect(await prisma.userLevelStat.count()).toBe(1);
  });

  it('reset all deletes leveling data but keeps config, rewards, and audit logs', async () => {
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 100,
      actorUserId: 'admin-1'
    });
    await prisma.invalidMessageEvent.create({
      data: {
        guildId: 'guild-1',
        userId: 'user-1',
        messageId: 'message-1',
        channelId: 'channel-1',
        reasonCode: 'SHORT'
      }
    });
    await prisma.roleReward.create({
      data: {
        guildId: 'guild-1',
        requiredLevel: 2,
        roleId: 'role-1',
        createdBy: 'admin-1'
      }
    });

    const result = await service.resetAll({
      guildId: 'guild-1',
      actorUserId: 'admin-1',
      confirmText: RESET_ALL_CONFIRM_TEXT
    });

    expect(result).toEqual({
      deletedUserStats: 1,
      deletedExpEvents: 1,
      deletedInvalidMessageEvents: 1
    });
    expect(await prisma.guildSetting.count()).toBe(1);
    expect(await prisma.roleReward.count()).toBe(1);
    expect(await prisma.userLevelStat.count()).toBe(0);
    expect(await prisma.expEvent.count()).toBe(0);
    expect(await prisma.invalidMessageEvent.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'reset.all' } })).toBe(1);
  });

  it('returns combined audit and EXP logs with user filtering', async () => {
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 100,
      actorUserId: 'admin-1'
    });
    await service.addManualExpWithAudit({
      guildId: 'guild-1',
      userId: 'user-2',
      amount: 100,
      actorUserId: 'admin-1'
    });

    const logs = await service.getAdminLogs({ guildId: 'guild-1', page: 1, limit: 25, userId: 'user-1' });

    expect(logs.entries).toHaveLength(2);
    expect(logs.entries.some((entry) => entry.type === 'audit' && entry.targetUserId === 'user-1')).toBe(true);
    expect(logs.entries.some((entry) => entry.type === 'exp' && entry.userId === 'user-1')).toBe(true);
    expect(logs.totalCount).toBe(2);
  });
});
