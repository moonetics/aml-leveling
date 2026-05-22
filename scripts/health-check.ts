import { commands } from '../src/commands/index.js';
import { getEnv } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';

async function main(): Promise<void> {
  const env = getEnv();

  await prisma.$queryRaw`SELECT 1`;

  if (commands.length === 0) {
    throw new Error('No slash commands are registered in the local command registry.');
  }

  console.log(
    JSON.stringify({
      ok: true,
      guildId: env.DISCORD_GUILD_ID,
      database: 'sqlite',
      commands: commands.map((command) => command.data.name)
    })
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
