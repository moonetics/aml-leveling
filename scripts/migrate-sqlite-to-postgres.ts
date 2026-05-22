import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

type SqliteRow = Record<string, string | number | null>;
type TableMigration = {
  tableName: string;
  modelName: keyof PrismaClient;
  orderBy: string;
  selectSql: string;
  mapRow: (row: SqliteRow) => Record<string, unknown>;
};

const BATCH_SIZE = 500;

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runSqliteJson(sqlitePath: string, sql: string): SqliteRow[] {
  try {
    const output = execFileSync('sqlite3', ['-json', sqlitePath, sql], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64
    }).trim();

    return output.length > 0 ? (JSON.parse(output) as SqliteRow[]) : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to query SQLite. Pastikan sqlite3 sudah terinstall. Detail: ${message}`);
  }
}

function tableExists(sqlitePath: string, tableName: string): boolean {
  const rows = runSqliteJson(
    sqlitePath,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '${tableName.replace(/'/g, "''")}'`
  );
  return rows.length > 0;
}

function countRows(sqlitePath: string, tableName: string): number {
  const rows = runSqliteJson(sqlitePath, `SELECT COUNT(*) AS count FROM "${tableName}"`);
  return Number(rows[0]?.count ?? 0);
}

function asString(value: string | number | null): string {
  return value === null ? '' : String(value);
}

function asNullableString(value: string | number | null): string | null {
  return value === null ? null : String(value);
}

function asBoolean(value: string | number | null): boolean {
  return value === 1 || value === '1' || value === 'true';
}

function asNumber(value: string | number | null): number {
  return Number(value ?? 0);
}

function asBigInt(value: string | number | null): bigint {
  return BigInt(String(value ?? 0));
}

function asDate(value: string | number | null): Date {
  if (value === null) {
    return new Date(0);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value from SQLite: ${String(value)}`);
  }

  return date;
}

function asNullableDate(value: string | number | null): Date | null {
  return value === null ? null : asDate(value);
}

const tableMigrations: TableMigration[] = [
  {
    tableName: 'guild_settings',
    modelName: 'guildSetting',
    orderBy: 'guild_id',
    selectSql: '*',
    mapRow: (row) => ({
      guildId: asString(row.guild_id),
      enabled: asBoolean(row.enabled),
      minExp: asNumber(row.min_exp),
      maxExp: asNumber(row.max_exp),
      cooldownSeconds: asNumber(row.cooldown_seconds),
      dailyExpCap: asNumber(row.daily_exp_cap),
      timezone: asString(row.timezone),
      leaderboardEnabled: asBoolean(row.leaderboard_enabled),
      leaderboardChannelId: asNullableString(row.leaderboard_channel_id),
      leaderboardMessageId: asNullableString(row.leaderboard_message_id),
      leaderboardTopLimit: asNumber(row.leaderboard_top_limit),
      levelUpChannelId: asNullableString(row.level_up_channel_id),
      levelUpTemplate: asNullableString(row.level_up_template),
      roleRewardMode: asString(row.role_reward_mode),
      allowLinkOnlyExp: asBoolean(row.allow_link_only_exp),
      allowEmojiOnlyExp: asBoolean(row.allow_emoji_only_exp),
      allowAttachmentOnlyExp: asBoolean(row.allow_attachment_only_exp),
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at)
    })
  },
  {
    tableName: 'guild_exp_channels',
    modelName: 'guildExpChannel',
    orderBy: 'created_at, id',
    selectSql: '*',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      channelId: asString(row.channel_id),
      mode: asString(row.mode),
      createdBy: asNullableString(row.created_by),
      createdAt: asDate(row.created_at)
    })
  },
  {
    tableName: 'user_level_stats',
    modelName: 'userLevelStat',
    orderBy: 'guild_id, user_id',
    selectSql:
      'guild_id, user_id, CAST(total_exp AS TEXT) AS total_exp, current_level, CAST(current_level_exp AS TEXT) AS current_level_exp, CAST(required_exp_to_next_level AS TEXT) AS required_exp_to_next_level, CAST(valid_message_count AS TEXT) AS valid_message_count, CAST(invalid_message_count AS TEXT) AS invalid_message_count, daily_exp, daily_exp_date, last_exp_gain_at, last_message_at, last_level_up_at, created_at, updated_at',
    mapRow: (row) => ({
      guildId: asString(row.guild_id),
      userId: asString(row.user_id),
      totalExp: asBigInt(row.total_exp),
      currentLevel: asNumber(row.current_level),
      currentLevelExp: asBigInt(row.current_level_exp),
      requiredExpToNextLevel: asBigInt(row.required_exp_to_next_level),
      validMessageCount: asBigInt(row.valid_message_count),
      invalidMessageCount: asBigInt(row.invalid_message_count),
      dailyExp: asNumber(row.daily_exp),
      dailyExpDate: asNullableDate(row.daily_exp_date),
      lastExpGainAt: asNullableDate(row.last_exp_gain_at),
      lastMessageAt: asNullableDate(row.last_message_at),
      lastLevelUpAt: asNullableDate(row.last_level_up_at),
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at)
    })
  },
  {
    tableName: 'role_rewards',
    modelName: 'roleReward',
    orderBy: 'created_at, id',
    selectSql: '*',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      requiredLevel: asNumber(row.required_level),
      roleId: asString(row.role_id),
      isActive: asBoolean(row.is_active),
      createdBy: asNullableString(row.created_by),
      createdAt: asDate(row.created_at),
      updatedAt: asDate(row.updated_at)
    })
  },
  {
    tableName: 'exp_events',
    modelName: 'expEvent',
    orderBy: 'created_at, id',
    selectSql:
      'id, guild_id, user_id, source, amount, CAST(old_total_exp AS TEXT) AS old_total_exp, CAST(new_total_exp AS TEXT) AS new_total_exp, old_level, new_level, reason_code, message_id, channel_id, actor_user_id, metadata, created_at',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      userId: asString(row.user_id),
      source: asString(row.source),
      amount: asNumber(row.amount),
      oldTotalExp: asBigInt(row.old_total_exp),
      newTotalExp: asBigInt(row.new_total_exp),
      oldLevel: asNumber(row.old_level),
      newLevel: asNumber(row.new_level),
      reasonCode: asNullableString(row.reason_code),
      messageId: asNullableString(row.message_id),
      channelId: asNullableString(row.channel_id),
      actorUserId: asNullableString(row.actor_user_id),
      metadata: asNullableString(row.metadata),
      createdAt: asDate(row.created_at)
    })
  },
  {
    tableName: 'invalid_message_events',
    modelName: 'invalidMessageEvent',
    orderBy: 'created_at, id',
    selectSql: '*',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      userId: asString(row.user_id),
      messageId: asString(row.message_id),
      channelId: asString(row.channel_id),
      reasonCode: asString(row.reason_code),
      metadata: asNullableString(row.metadata),
      createdAt: asDate(row.created_at)
    })
  },
  {
    tableName: 'audit_logs',
    modelName: 'auditLog',
    orderBy: 'created_at, id',
    selectSql: '*',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      actorUserId: asString(row.actor_user_id),
      action: asString(row.action),
      targetUserId: asNullableString(row.target_user_id),
      before: asNullableString(row.before),
      after: asNullableString(row.after),
      reason: asNullableString(row.reason),
      createdAt: asDate(row.created_at)
    })
  },
  {
    tableName: 'command_usage_events',
    modelName: 'commandUsageEvent',
    orderBy: 'created_at, id',
    selectSql: '*',
    mapRow: (row) => ({
      id: asString(row.id),
      guildId: asString(row.guild_id),
      userId: asString(row.user_id),
      commandName: asString(row.command_name),
      targetUserId: asNullableString(row.target_user_id),
      createdAt: asDate(row.created_at)
    })
  }
];

async function assertPostgresIsEmpty(prisma: PrismaClient): Promise<void> {
  const counts = await Promise.all([
    prisma.guildSetting.count(),
    prisma.guildExpChannel.count(),
    prisma.userLevelStat.count(),
    prisma.roleReward.count(),
    prisma.expEvent.count(),
    prisma.invalidMessageEvent.count(),
    prisma.auditLog.count(),
    prisma.commandUsageEvent.count()
  ]);
  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total > 0) {
    throw new Error(
      `PostgreSQL target is not empty (${total} rows). Gunakan database kosong untuk menghindari data dobel.`
    );
  }
}

async function importTable(prisma: PrismaClient, sqlitePath: string, migration: TableMigration): Promise<number> {
  if (!tableExists(sqlitePath, migration.tableName)) {
    console.log(`skip ${migration.tableName}: table tidak ada di SQLite`);
    return 0;
  }

  const total = countRows(sqlitePath, migration.tableName);
  const delegate = prisma[migration.modelName] as unknown as {
    createMany(input: { data: Record<string, unknown>[]; skipDuplicates?: boolean }): Promise<{ count: number }>;
  };
  let imported = 0;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const rows = runSqliteJson(
      sqlitePath,
      `SELECT ${migration.selectSql} FROM "${migration.tableName}" ORDER BY ${migration.orderBy} LIMIT ${BATCH_SIZE} OFFSET ${offset}`
    );
    const data = rows.map(migration.mapRow);

    if (data.length > 0) {
      const result = await delegate.createMany({ data, skipDuplicates: true });
      imported += result.count;
    }
  }

  console.log(`imported ${migration.tableName}: ${imported}/${total}`);
  return imported;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? '';

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL harus PostgreSQL saat menjalankan script migrasi ini.');
  }

  const sqliteArg = getArgValue('--sqlite');
  const sqlitePath = resolve(sqliteArg ?? 'data/production.db');

  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite database tidak ditemukan: ${sqlitePath}`);
  }

  const prisma = new PrismaClient();

  try {
    await assertPostgresIsEmpty(prisma);

    const imported: Record<string, number> = {};

    for (const migration of tableMigrations) {
      imported[migration.tableName] = await importTable(prisma, sqlitePath, migration);
    }

    console.log(JSON.stringify({ ok: true, sqlitePath, imported }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
