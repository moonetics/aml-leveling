import { REST, Routes } from 'discord.js';

import { commands } from '../src/commands/index.js';
import { getEnv } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

async function main(): Promise<void> {
  const env = getEnv();
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const commandPayload = commands.map((command) => command.data.toJSON());

  if (env.DISCORD_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
      body: commandPayload
    });

    logger.info(
      { guildId: env.DISCORD_GUILD_ID, count: commandPayload.length },
      'Registered guild slash commands'
    );
    return;
  }

  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: commandPayload
  });

  logger.info({ count: commandPayload.length }, 'Registered global slash commands');
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to register slash commands');
  process.exit(1);
});

