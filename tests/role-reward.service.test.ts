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
  { requiredLevel: 1, roleId: 'role-1-2', name: 'Level 1-2', range: 'Level 1-2', color: '#B8F3FF' },
  { requiredLevel: 3, roleId: 'role-3-5', name: 'Level 3-5', range: 'Level 3-5', color: '#B8E8FF' },
  { requiredLevel: 46, roleId: 'role-46-50', name: 'Level 46-50', range: 'Level 46-50', color: '#C9F3C7' },
  { requiredLevel: 91, roleId: 'role-91-100', name: 'Level 91-100+', range: 'Level 91+', color: '#E9E1D8' }
];

function createMockGuild(memberRoleIds: string[] = []) {
  const roleStore = new Map([
    ['role-1-2', { id: 'role-1-2', position: 1 }],
    ['role-3-5', { id: 'role-3-5', position: 2 }],
    ['role-46-50', { id: 'role-46-50', position: 8 }],
    ['role-91-100', { id: 'role-91-100', position: 20 }],
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
    [1, 'role-1-2'],
    [4, 'role-3-5'],
    [50, 'role-46-50'],
    [105, 'role-91-100']
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
    const guild = createMockGuild(['role-1-2', 'role-3-5']);
    await prisma.userLevelStat.create({
      data: { guildId: 'guild-1', userId: 'user-1', currentLevel: 50, totalExp: 1000n }
    });

    const result = await service.syncUserRewards(guild as never, 'user-1');

    expect(result.addedRoleIds).toEqual(['role-46-50']);
    expect(result.removedRoleIds).toEqual(['role-1-2', 'role-3-5']);
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
