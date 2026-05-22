import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { RankService } from '../src/modules/leveling/rank.service.js';

const databaseUrl = 'file:./test-rank-service.db';
const databasePath = join(process.cwd(), 'prisma', 'test-rank-service.db');

describe('RankService', () => {
  let prisma: PrismaClient;
  let service: RankService;

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
    service = new RankService(prisma);
  });

  beforeEach(async () => {
    await prisma.roleReward.deleteMany();
    await prisma.userLevelStat.deleteMany();
    await prisma.guildSetting.deleteMany();
    await prisma.guildSetting.create({ data: { guildId: 'guild-1' } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it('returns a default profile for a user without data', async () => {
    const profile = await service.getUserProfile('guild-1', 'missing-user');

    expect(profile.hasData).toBe(false);
    expect(profile.currentLevel).toBe(1);
    expect(profile.totalExp).toBe(0n);
    expect(profile.currentLevelExp).toBe(0n);
    expect(profile.requiredExpToNextLevel).toBe(100n);
  });

  it('sorts rank by level, exp, older update, then user id', async () => {
    await prisma.userLevelStat.createMany({
      data: [
        {
          guildId: 'guild-1',
          userId: 'user-c',
          totalExp: 500n,
          currentLevel: 3,
          updatedAt: new Date('2026-05-22T03:00:00.000Z')
        },
        {
          guildId: 'guild-1',
          userId: 'user-a',
          totalExp: 500n,
          currentLevel: 3,
          updatedAt: new Date('2026-05-22T01:00:00.000Z')
        },
        {
          guildId: 'guild-1',
          userId: 'user-b',
          totalExp: 600n,
          currentLevel: 3,
          updatedAt: new Date('2026-05-22T02:00:00.000Z')
        },
        {
          guildId: 'guild-1',
          userId: 'user-d',
          totalExp: 999n,
          currentLevel: 2,
          updatedAt: new Date('2026-05-22T00:00:00.000Z')
        }
      ]
    });

    await expect(service.getUserRank('guild-1', 'user-b')).resolves.toBe(1);
    await expect(service.getUserRank('guild-1', 'user-a')).resolves.toBe(2);
    await expect(service.getUserRank('guild-1', 'user-c')).resolves.toBe(3);
    await expect(service.getUserRank('guild-1', 'user-d')).resolves.toBe(4);
  });

  it('returns paginated leaderboard entries', async () => {
    await prisma.userLevelStat.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        guildId: 'guild-1',
        userId: `user-${String(index + 1).padStart(2, '0')}`,
        totalExp: BigInt(1000 - index),
        currentLevel: 2
      }))
    });

    const firstPage = await service.getLeaderboardPage('guild-1', 1);
    const secondPage = await service.getLeaderboardPage('guild-1', 2);
    const outOfRange = await service.getLeaderboardPage('guild-1', 99);

    expect(firstPage.entries).toHaveLength(10);
    expect(secondPage.entries).toHaveLength(2);
    expect(secondPage.entries[0]?.rank).toBe(11);
    expect(outOfRange.page).toBe(2);
  });

  it('lists static role rewards by required level', async () => {
    const rewards = await service.getActiveRewards('guild-1');

    expect(rewards[0]).toMatchObject({ requiredLevel: 1, roleId: '1507285713882976317' });
    expect(rewards).toHaveLength(20);
    expect(rewards.at(-1)).toMatchObject({ requiredLevel: 91, roleId: '1507424064136937482' });
  });
});
