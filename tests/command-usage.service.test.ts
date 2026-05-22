import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CommandUsageService } from '../src/modules/commands/command-usage.service.js';

const databaseUrl = 'file:./test-command-usage-service.db';
const databasePath = join(process.cwd(), 'prisma', 'test-command-usage-service.db');

describe('CommandUsageService', () => {
  let prisma: PrismaClient;
  let service: CommandUsageService;

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
    service = new CommandUsageService(prisma);
  });

  beforeEach(async () => {
    await prisma.commandUsageEvent.deleteMany();
    await prisma.guildSetting.deleteMany();
    await prisma.guildSetting.create({ data: { guildId: 'guild-1' } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    if (existsSync(databasePath)) {
      rmSync(databasePath, { force: true });
    }
  });

  it('records and summarizes profile check usage by user', async () => {
    await service.recordProfileCheck({ guildId: 'guild-1', userId: 'user-a', commandName: 'level' });
    await service.recordProfileCheck({ guildId: 'guild-1', userId: 'user-a', commandName: 'rank' });
    await service.recordProfileCheck({ guildId: 'guild-1', userId: 'user-b', commandName: 'profile' });

    const rows = await service.getProfileCheckStats('guild-1', 10);

    expect(rows[0]).toMatchObject({
      userId: 'user-a',
      totalCount: 2,
      levelCount: 1,
      rankCount: 1,
      profileCount: 0
    });
    expect(rows[0]?.lastUsedAt).toBeInstanceOf(Date);
    expect(rows[1]).toMatchObject({
      userId: 'user-b',
      totalCount: 1,
      profileCount: 1
    });
  });
});
