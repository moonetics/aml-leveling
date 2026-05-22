import { Client, GatewayIntentBits } from 'discord.js';

import { getEnv } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import { roleRewardService } from '../src/modules/leveling/role-reward.service.js';

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    await guild.roles.fetch();
    await guild.members.fetchMe();

    const results = await roleRewardService.syncAllUsersWithStats(guild);
    const synced = results.filter((result) => !result.skipped).length;
    const skipped = results.filter((result) => result.skipped);

    console.log(
      JSON.stringify(
        {
          ok: skipped.length === 0,
          guildId: guild.id,
          processed: results.length,
          synced,
          skipped: skipped.map((result) => ({
            userId: result.userId,
            reason: result.reason
          }))
        },
        null,
        2
      )
    );

    if (skipped.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    client.destroy();
  }
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
