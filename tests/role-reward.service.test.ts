import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoleRewardService } from '../src/modules/leveling/role-reward.service.js';
import type { StaticLevelRoleReward } from '../src/modules/leveling/static-level-roles.js';

const databaseUrl = 'file:./test-role-reward-service.db';
const databasePath = join(process.cwd(), 'prisma', 'test-role-reward-service.db');
const testRewards: readonly StaticLevelRoleReward[] = [
  { requiredLevel: 1, roleId: 'role-1', name: 'Level 1', range: 'Level 1' },
  { requiredLevel: 2, roleId: 'role-2-3', name: 'Level 2-3', range: 'Level 2-3' },
  { requiredLevel: 8, roleId: 'role-8-10', name: 'Level 8-10', range: 'Level 8-10' },
  { requiredLevel: 50, roleId: 'role-50', name: 'Level 50', range: 'Level 50+' }
];

function createMockGuild(memberRoleIds: string[] = []) {
  const roleStore = new Map([
    ['role-1', { id: 'role-1', position: 1 }],
    ['role-2-3', { id: 'role-2-3', position: 2 }],
    ['role-8-10', { id: 'role-8-10', position: 8 }],
    ['role-50', { id: 'role-50', position: 20 }],
    ['bot-role', { id: 'bot-role', position: 50 }]
  ]);
  const memberRoles = new Map(
    memberRoleIds.map((roleId) => [roleId, roleStore.get(roleId) ?? { id: roleId, position: 1 }])
  );
  const member = {
    user: { bot: false },
    roles: {
      cache: {
        has: (roleId: string) => memberRoles.has(roleId),
        filter: (predicate: (role: { id: string }) => boolean) =>
          new Map([...memberRoles.entries()].filter(([, role]) => predicate(role))),
        values: () => memberRoles.values()
      },
      add: vi.fn(async (role: { id: string }) => {
        memberRoles.set(role.id, role);
      }),
      remove: vi.fn(async (role: { id: string }) => {
        memberRoles.delete(role.id);
      }),
      highest: roleStore.get('bot-role')
    }
  };

  return {
    id: 'guild-1',
    members: {
      me: { roles: { highest: roleStore.get('bot-role') } },
      cache: new Map([['user-1', member]]),
      fetch: vi.fn(async (userId: string) => (userId === 'user-1' ? member : null))
    },
    roles: {
      cache: roleStore,
      fetch: vi.fn(async (roleId: string) => roleStore.get(roleId) ?? null)
    },
    __memberRoles: memberRoles
  };
}

describe('RoleRewardService static role rewards', () => {
  let prisma: PrismaClient;
  let service: RoleRewardService;

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
    service = new RoleRewardService(prisma, testRewards);
  });

  beforeEach(async () => {
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

  it.each([
    [1, 'role-1'],
    [3, 'role-2-3'],
    [10, 'role-8-10'],
    [55, 'role-50']
  ])('syncs level %s to the highest eligible static role', async (currentLevel, expectedRoleId) => {
    const guild = createMockGuild();
    await prisma.userLevelStat.create({
      data: { guildId: 'guild-1', userId: 'user-1', currentLevel, totalExp: 1000n }
    });

    const result = await service.syncUserRewards(guild as never, 'user-1');

    expect(result.addedRoleIds).toEqual([expectedRoleId]);
    expect(result.removedRoleIds).toEqual([]);
  });

  it('removes older level roles and leaves only the highest eligible role', async () => {
    const guild = createMockGuild(['role-1', 'role-2-3']);
    await prisma.userLevelStat.create({
      data: { guildId: 'guild-1', userId: 'user-1', currentLevel: 10, totalExp: 1000n }
    });

    const result = await service.syncUserRewards(guild as never, 'user-1');

    expect(result.addedRoleIds).toEqual(['role-8-10']);
    expect(result.removedRoleIds).toEqual(['role-1', 'role-2-3']);
  });

  it('skips users without stats', async () => {
    const guild = createMockGuild();

    const result = await service.syncUserRewards(guild as never, 'user-1');

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('NO_STATS');
  });

  it('sync-all processes users with stats only', async () => {
    const guild = createMockGuild();
    await prisma.userLevelStat.create({
      data: { guildId: 'guild-1', userId: 'user-1', currentLevel: 10, totalExp: 100n }
    });

    const results = await service.syncAllUsersWithStats(guild as never);

    expect(results).toHaveLength(1);
    expect(results[0]?.userId).toBe('user-1');
  });
});
