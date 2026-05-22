import { Client, GatewayIntentBits } from 'discord.js';

import { getEnv } from '../src/config/env.js';

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    await guild.roles.fetch();
    await guild.members.fetchMe();

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name))
      .map((role) => ({
        position: role.position,
        name: role.name,
        id: role.id,
        color: role.hexColor,
        hoist: role.hoist,
        mentionable: role.mentionable,
        managed: role.managed,
        members: role.members.size
      }));

    console.table(roles);
    console.log(
      JSON.stringify(
        {
          ok: true,
          guildId: guild.id,
          roleCount: roles.length,
          highestFirst: true
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
