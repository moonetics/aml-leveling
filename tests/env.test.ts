import { describe, expect, it } from 'vitest';

import { parseEnv } from '../src/config/env.js';

describe('parseEnv', () => {
  it('parses required environment values with defaults', () => {
    const env = parseEnv({
      DISCORD_TOKEN: 'token',
      DISCORD_CLIENT_ID: 'client-id',
      DISCORD_GUILD_ID: 'guild-id',
      DATABASE_URL: 'file:./dev.db'
    });

    expect(env.DISCORD_GUILD_ID).toBe('guild-id');
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.DEFAULT_TIMEZONE).toBe('Asia/Jakarta');
    expect(env.LEADERBOARD_UPDATE_INTERVAL_SECONDS).toBe(60);
  });

  it('throws a helpful error for missing required values', () => {
    expect(() => parseEnv({})).toThrow(/Invalid environment configuration/);
  });

  it('accepts regular database URLs too', () => {
    const env = parseEnv({
      DISCORD_TOKEN: 'token',
      DISCORD_CLIENT_ID: 'client-id',
      DISCORD_GUILD_ID: 'guild-id',
      DATABASE_URL: 'postgresql://aml:change_me@localhost:5432/aml_leveling'
    });

    expect(env.DATABASE_URL).toContain('postgresql://');
  });
});
