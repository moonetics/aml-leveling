import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';

import { getEnv } from '../src/config/env.js';

const LEVEL_ROLE_NAMES = new Set([
  'Level 1',
  'Level 2-3',
  'Level 4-5',
  'Level 6-7',
  'Level 8-10',
  'Level 11-13',
  'Level 14-16',
  'Level 17-19',
  'Level 20-22',
  'Level 23-25',
  'Level 26-28',
  'Level 29-31',
  'Level 32-34',
  'Level 35-37',
  'Level 38-40',
  'Level 41-43',
  'Level 44-46',
  'Level 47-48',
  'Level 49',
  'Level 50'
]);

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    const me = await guild.members.fetchMe();

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('Bot membutuhkan permission Manage Roles untuk menghapus role leveling.');
    }

    const roles = await guild.roles.fetch();
    const targetRoles = roles.filter((role) => LEVEL_ROLE_NAMES.has(role.name));
    const deleted: string[] = [];
    const failed: Array<{ name: string; reason: string }> = [];

    for (const role of targetRoles.values()) {
      try {
        await role.delete('AML Leveling cleanup: delete level reward roles');
        deleted.push(role.name);
      } catch (error) {
        failed.push({
          name: role.name,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          guildId: guild.id,
          matched: targetRoles.size,
          deleted,
          failed,
          skipped: [...LEVEL_ROLE_NAMES].filter(
            (roleName) => !targetRoles.some((role) => role.name === roleName)
          )
        },
        null,
        2
      )
    );

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    client.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
