import { PermissionsBitField } from 'discord.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureAdmin, ensureTargetGuild } from '../src/commands/guards.js';
import { resetEnvCacheForTests } from '../src/config/env.js';

function makeInteraction(overrides: Record<string, unknown> = {}) {
  return {
    guildId: 'guild-1',
    memberPermissions: new PermissionsBitField(PermissionsBitField.Flags.ManageGuild),
    reply: vi.fn(),
    ...overrides
  } as never;
}

describe('command guards', () => {
  beforeEach(() => {
    process.env.DISCORD_TOKEN = 'token';
    process.env.DISCORD_CLIENT_ID = 'client-id';
    process.env.DISCORD_GUILD_ID = 'guild-1';
    process.env.DATABASE_URL = 'file:./dev.db';
    resetEnvCacheForTests();
  });

  it('allows target guild interactions', async () => {
    const interaction = makeInteraction();

    await expect(ensureTargetGuild(interaction)).resolves.toBe(true);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('rejects non-target guild interactions', async () => {
    const interaction = makeInteraction({ guildId: 'other-guild' });

    await expect(ensureTargetGuild(interaction)).resolves.toBe(false);
    expect(interaction.reply).toHaveBeenCalledOnce();
  });

  it('allows Manage Guild admins', async () => {
    const interaction = makeInteraction();

    await expect(ensureAdmin(interaction)).resolves.toBe(true);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it('rejects users without Manage Guild', async () => {
    const interaction = makeInteraction({ memberPermissions: new PermissionsBitField(0n) });

    await expect(ensureAdmin(interaction)).resolves.toBe(false);
    expect(interaction.reply).toHaveBeenCalledOnce();
  });
});

