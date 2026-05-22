import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

export const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().min(1, 'DISCORD_GUILD_ID is required'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('file:') || z.string().url().safeParse(value).success,
      'DATABASE_URL must be a valid URL or SQLite file: path'
    ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  DEFAULT_TIMEZONE: z.string().min(1).default('Asia/Jakarta'),
  LEADERBOARD_UPDATE_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60)
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function parseEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}

export function getEnv(): AppEnv {
  cachedEnv ??= parseEnv();
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
