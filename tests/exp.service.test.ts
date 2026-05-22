import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ExpService } from '../src/modules/leveling/exp.service.js';
import { LevelFormulaService } from '../src/modules/leveling/level-formula.js';

const databaseUrl = 'file:./test-exp-service.db';
const databasePath = join(process.cwd(), 'prisma', 'test-exp-service.db');

describe('ExpService', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }

    execFileSync('npx prisma db push --schema prisma/schema.prisma --force-reset --skip-generate', {
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        RUST_LOG: 'debug'
      },
      shell: true,
      stdio: 'pipe'
    });

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    });
  });

  beforeEach(async () => {
    await prisma.expEvent.deleteMany();
    await prisma.userLevelStat.deleteMany();
    await prisma.guildSetting.deleteMany();
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it('grants chat EXP, creates stats, and inserts an EXP event', async () => {
    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);

    const result = await service.grantChatExp({
      guildId: 'guild-1',
      userId: 'user-1',
      messageId: 'message-1',
      channelId: 'channel-1',
      now: new Date('2026-05-22T05:00:00.000Z'),
      metadata: { contentLength: 20 }
    });

    const events = await prisma.expEvent.findMany();

    expect(result.granted).toBe(true);
    expect(result.amount).toBe(8);
    expect(result.newTotalExp).toBe(8n);
    expect(result.stat.validMessageCount).toBe(1n);
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata).toBe(JSON.stringify({ contentLength: 20 }));
  });

  it('clamps chat EXP to remaining daily cap', async () => {
    await prisma.guildSetting.create({
      data: {
        guildId: 'guild-1',
        minExp: 5,
        maxExp: 10,
        dailyExpCap: 500,
        timezone: 'Asia/Jakarta'
      }
    });
    await prisma.userLevelStat.create({
      data: {
        guildId: 'guild-1',
        userId: 'user-1',
        dailyExp: 496,
        dailyExpDate: new Date('2026-05-22T00:00:00.000Z')
      }
    });

    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);
    const result = await service.grantChatExp({
      guildId: 'guild-1',
      userId: 'user-1',
      messageId: 'message-1',
      channelId: 'channel-1',
      now: new Date('2026-05-22T05:00:00.000Z')
    });

    expect(result.amount).toBe(4);
    expect(result.dailyExpAfter).toBe(500);
    expect(result.newTotalExp).toBe(4n);
  });

  it('treats daily cap 0 as disabled and grants full chat EXP', async () => {
    await prisma.guildSetting.create({
      data: {
        guildId: 'guild-1',
        minExp: 5,
        maxExp: 10,
        dailyExpCap: 0,
        timezone: 'Asia/Jakarta'
      }
    });
    await prisma.userLevelStat.create({
      data: {
        guildId: 'guild-1',
        userId: 'user-1',
        dailyExp: 9999,
        dailyExpDate: new Date('2026-05-22T00:00:00.000Z')
      }
    });

    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);
    const result = await service.grantChatExp({
      guildId: 'guild-1',
      userId: 'user-1',
      messageId: 'message-1',
      channelId: 'channel-1',
      now: new Date('2026-05-22T05:00:00.000Z')
    });

    expect(result.granted).toBe(true);
    expect(result.amount).toBe(8);
    expect(result.dailyCapReached).toBe(false);
    expect(result.dailyExpAfter).toBe(10007);
  });

  it('resets daily EXP when timezone date changes', async () => {
    await prisma.guildSetting.create({
      data: {
        guildId: 'guild-1',
        dailyExpCap: 500,
        timezone: 'Asia/Jakarta'
      }
    });
    await prisma.userLevelStat.create({
      data: {
        guildId: 'guild-1',
        userId: 'user-1',
        dailyExp: 500,
        dailyExpDate: new Date('2026-05-21T00:00:00.000Z')
      }
    });

    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);
    const result = await service.grantChatExp({
      guildId: 'guild-1',
      userId: 'user-1',
      messageId: 'message-1',
      channelId: 'channel-1',
      now: new Date('2026-05-22T05:00:00.000Z')
    });

    expect(result.granted).toBe(true);
    expect(result.dailyExpBefore).toBe(0);
    expect(result.dailyExpAfter).toBe(8);
  });

  it('supports manual add, remove, and set with recalculated level', async () => {
    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);

    const addResult = await service.addManualExp({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 1000,
      actorUserId: 'admin-1',
      reason: 'manual add'
    });
    const removeResult = await service.removeManualExp({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 950,
      actorUserId: 'admin-1',
      reason: 'manual remove'
    });
    const setResult = await service.setManualExp({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 0,
      actorUserId: 'admin-1',
      reason: 'manual set'
    });

    expect(addResult.newLevel).toBe(4);
    expect(removeResult.newTotalExp).toBe(50n);
    expect(removeResult.newLevel).toBe(1);
    expect(setResult.newTotalExp).toBe(0n);
    expect(setResult.newLevel).toBe(1);
    expect(await prisma.expEvent.count()).toBe(3);
  });

  it('clamps manual remove below zero', async () => {
    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);

    const result = await service.removeManualExp({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 999,
      actorUserId: 'admin-1'
    });

    expect(result.newTotalExp).toBe(0n);
    expect(result.amount).toBe(0);
  });

  it('records invalid messages without inserting EXP events', async () => {
    const service = new ExpService(prisma, new LevelFormulaService(), () => 8);

    await service.recordInvalidMessage('guild-1', 'user-1', new Date('2026-05-22T05:00:00.000Z'));

    const stat = await prisma.userLevelStat.findUniqueOrThrow({
      where: { guildId_userId: { guildId: 'guild-1', userId: 'user-1' } }
    });

    expect(stat.invalidMessageCount).toBe(1n);
    expect(await prisma.expEvent.count()).toBe(0);
  });
});
