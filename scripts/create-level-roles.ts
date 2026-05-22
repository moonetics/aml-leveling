import { Client, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';

import { getEnv } from '../src/config/env.js';

type LevelRoleDefinition = {
  requiredLevel: number;
  name: string;
  range: string;
};

const LEVEL_ROLES: readonly LevelRoleDefinition[] = [
  { requiredLevel: 1, name: 'Level 1', range: 'Level 1' },
  { requiredLevel: 2, name: 'Level 2-3', range: 'Level 2-3' },
  { requiredLevel: 4, name: 'Level 4-5', range: 'Level 4-5' },
  { requiredLevel: 6, name: 'Level 6-7', range: 'Level 6-7' },
  { requiredLevel: 8, name: 'Level 8-10', range: 'Level 8-10' },
  { requiredLevel: 11, name: 'Level 11-13', range: 'Level 11-13' },
  { requiredLevel: 14, name: 'Level 14-16', range: 'Level 14-16' },
  { requiredLevel: 17, name: 'Level 17-19', range: 'Level 17-19' },
  { requiredLevel: 20, name: 'Level 20-22', range: 'Level 20-22' },
  { requiredLevel: 23, name: 'Level 23-25', range: 'Level 23-25' },
  { requiredLevel: 26, name: 'Level 26-28', range: 'Level 26-28' },
  { requiredLevel: 29, name: 'Level 29-31', range: 'Level 29-31' },
  { requiredLevel: 32, name: 'Level 32-34', range: 'Level 32-34' },
  { requiredLevel: 35, name: 'Level 35-37', range: 'Level 35-37' },
  { requiredLevel: 38, name: 'Level 38-40', range: 'Level 38-40' },
  { requiredLevel: 41, name: 'Level 41-43', range: 'Level 41-43' },
  { requiredLevel: 44, name: 'Level 44-46', range: 'Level 44-46' },
  { requiredLevel: 47, name: 'Level 47-48', range: 'Level 47-48' },
  { requiredLevel: 49, name: 'Level 49', range: 'Level 49' },
  { requiredLevel: 50, name: 'Level 50', range: 'Level 50+' }
];

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    const me = await guild.members.fetchMe();

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('Bot membutuhkan permission Manage Roles untuk membuat role leveling.');
    }

    const roles = await guild.roles.fetch();
    const created: string[] = [];
    const skipped: string[] = [];

    for (const roleDefinition of [...LEVEL_ROLES].reverse()) {
      const existingRole = roles.find((role) => role.name === roleDefinition.name);

      if (existingRole) {
        skipped.push(roleDefinition.name);
        continue;
      }

      const role = await guild.roles.create({
        name: roleDefinition.name,
        hoist: false,
        mentionable: false,
        permissions: [],
        reason: `AML Leveling reward role for ${roleDefinition.range}`
      });

      roles.set(role.id, role);
      created.push(roleDefinition.name);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          guildId: guild.id,
          created,
          skipped,
          nextStep: 'Jalankan /leveling roles mode mode:highest_only lalu tambahkan reward role sesuai docs/role-level-mapping.md'
        },
        null,
        2
      )
    );
  } finally {
    client.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
