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
      throw new Error('Bot membutuhkan permission Manage Roles untuk membuat atau mengubah role leveling.');
    }

    const roles = await guild.roles.fetch();
    const created: Array<{ requiredLevel: number; name: string; roleId: string }> = [];
    const updated: Array<{ requiredLevel: number; name: string; roleId: string }> = [];
    const mapping: Array<{ requiredLevel: number; name: string; roleId: string }> = [];
    const levelRoles = [];

    for (const reward of [...STATIC_LEVEL_ROLE_REWARDS].reverse()) {
      const existingRole = roles.get(reward.roleId) ?? roles.find((role) => role.name === reward.name);

      if (existingRole) {
        await existingRole.edit({
          name: reward.name,
          color: reward.color as ColorResolvable,
          hoist: false,
          mentionable: false,
          reason: `AML Leveling role mapping for ${reward.range}`
        });
        updated.push({ requiredLevel: reward.requiredLevel, name: reward.name, roleId: existingRole.id });
        mapping.push({ requiredLevel: reward.requiredLevel, name: reward.name, roleId: existingRole.id });
        levelRoles.push({ role: existingRole, position: reward.requiredLevel });
        continue;
      }

      const role = await guild.roles.create({
        name: reward.name,
        color: reward.color as ColorResolvable,
        hoist: false,
        mentionable: false,
        permissions: [],
        reason: `AML Leveling reward role for ${reward.range}`
      });

      roles.set(role.id, role);
      created.push({ requiredLevel: reward.requiredLevel, name: reward.name, roleId: role.id });
      mapping.push({ requiredLevel: reward.requiredLevel, name: reward.name, roleId: role.id });
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
          created,
          updated,
          mapping: mapping.sort((a, b) => a.requiredLevel - b.requiredLevel),
          nextStep: 'Update STATIC_LEVEL_ROLE_REWARDS with any newly created role IDs, then run npm run roles:apply.'
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
