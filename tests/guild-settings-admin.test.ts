import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppCache, cacheKeys } from '../src/cache/cache.js';
import { AuditService } from '../src/modules/audit/audit.service.js';
import { GuildSettingsService } from '../src/modules/guild-settings/guild-settings.service.js';

const databaseUrl = 'file:./test-guild-settings-admin.db';
const databasePath = join(process.cwd(), 'prisma', 'test-guild-settings-admin.db');

describe('GuildSettingsService admin updates', () => {
  let prisma: PrismaClient;
  let cache: AppCache;
  let service: GuildSettingsService;

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
    await prisma.guildExpChannel.deleteMany();
    await prisma.guildSetting.deleteMany();
    cache = new AppCache();
    service = new GuildSettingsService(prisma, cache, new AuditService(prisma));
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it('updates settings, invalidates cache, and writes JSON audit strings', async () => {
    await service.ensureGuildSettings('guild-1');
    expect(cache.guildSettings.has(cacheKeys.guildSettings('guild-1'))).toBe(true);

    const updated = await service.updateExpRange('guild-1', 'admin-1', 12, 20);
    const audit = await prisma.auditLog.findFirstOrThrow();

    expect(updated.minExp).toBe(12);
    expect(updated.maxExp).toBe(20);
    expect(cache.guildSettings.has(cacheKeys.guildSettings('guild-1'))).toBe(false);
    expect(audit.action).toBe('LEVELING_EXP_RANGE_UPDATE');
    expect(JSON.parse(audit.before ?? '{}')).toMatchObject({ guildId: 'guild-1', minExp: 5 });
    expect(JSON.parse(audit.after ?? '{}')).toMatchObject({ guildId: 'guild-1', minExp: 12 });
  });

  it('adds and removes channel rules with audit logs', async () => {
    await service.addChannelRule('guild-1', 'admin-1', 'channel-1', 'allow');
    await service.addChannelRule('guild-1', 'admin-1', 'channel-1', 'allow');
    const removed = await service.removeChannelRule('guild-1', 'admin-1', 'channel-1', 'allow');

    expect(removed).toBe(true);
    expect(await prisma.guildExpChannel.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(2);
  });

  it('returns false when removing a missing channel rule', async () => {
    await expect(service.removeChannelRule('guild-1', 'admin-1', 'channel-1', 'ignore')).resolves.toBe(
      false
    );
  });

  it('updates leaderboard settings and role reward mode', async () => {
    await service.ensureGuildSettings('guild-1');

    const leaderboard = await service.updateLeaderboardConfig('guild-1', 'admin-1', {
      leaderboardEnabled: true,
      leaderboardChannelId: 'channel-1',
      leaderboardMessageId: 'message-1'
    });
    const roleMode = await service.updateRoleRewardMode('guild-1', 'admin-1', 'highest_only');

    expect(leaderboard.leaderboardEnabled).toBe(true);
    expect(leaderboard.leaderboardChannelId).toBe('channel-1');
    expect(roleMode.roleRewardMode).toBe('highest_only');
    expect(await prisma.auditLog.count()).toBe(2);
  });

  it('updates and disables level-up history channel with audit logs and cache invalidation', async () => {
    await service.ensureGuildSettings('guild-1');
    expect(cache.guildSettings.has(cacheKeys.guildSettings('guild-1'))).toBe(true);

    const updated = await service.updateLevelUpChannel('guild-1', 'admin-1', 'history-channel-1');
    expect(updated.levelUpChannelId).toBe('history-channel-1');
    expect(cache.guildSettings.has(cacheKeys.guildSettings('guild-1'))).toBe(false);

    await service.ensureGuildSettings('guild-1');
    const disabled = await service.disableLevelUpChannel('guild-1', 'admin-1');
    expect(disabled.levelUpChannelId).toBeNull();

    const audits = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    expect(audits.map((audit) => audit.action)).toEqual([
      'LEVELING_HISTORY_CHANNEL_UPDATE',
      'LEVELING_HISTORY_CHANNEL_DISABLE'
    ]);
    expect(JSON.parse(audits[0]?.after ?? '{}')).toMatchObject({
      guildId: 'guild-1',
      levelUpChannelId: 'history-channel-1'
    });
  });
});
