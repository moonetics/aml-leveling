import { Client, GatewayIntentBits, PermissionFlagsBits, type ColorResolvable } from 'discord.js';

import { getEnv } from '../src/config/env.js';
import { STATIC_LEVEL_ROLE_REWARDS } from '../src/modules/leveling/static-level-roles.js';

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    const me = await guild.members.fetchMe();

    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error('Bot membutuhkan permission Manage Roles untuk mengubah role leveling.');
    }

    const roles = await guild.roles.fetch();
    const missing = STATIC_LEVEL_ROLE_REWARDS.filter((reward) => !roles.has(reward.roleId));

    if (missing.length > 0) {
      console.error(
        JSON.stringify(
          {
            ok: false,
            guildId: guild.id,
            missing: missing.map((reward) => ({
              requiredLevel: reward.requiredLevel,
              name: reward.name,
              roleId: reward.roleId
            }))
          },
          null,
          2
        )
      );
      process.exitCode = 1;
      return;
    }

    const updated: Array<{ id: string; beforeName: string; afterName: string; color: string }> = [];
    const levelRoles = [];

    for (const reward of STATIC_LEVEL_ROLE_REWARDS) {
      const role = roles.get(reward.roleId);

      if (!role) {
        continue;
      }

      const beforeName = role.name;
      await role.edit({
        name: reward.name,
        color: reward.color as ColorResolvable,
        hoist: false,
        mentionable: false,
        reason: `AML Leveling role mapping for ${reward.range}`
      });
      updated.push({
        id: role.id,
        beforeName,
        afterName: reward.name,
        color: reward.color
      });
      levelRoles.push({ role, position: reward.requiredLevel });
    }

    await guild.roles.setPositions(
      levelRoles
        .sort((a, b) => a.position - b.position)
        .map((entry, index) => ({
          role: entry.role,
          position: index + 1
        }))
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          guildId: guild.id,
          updated
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
