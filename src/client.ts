import { Client, Events, GatewayIntentBits } from 'discord.js';

import { handleInteractionCreate } from './events/interaction-create.event.js';
import { handleMessageCreate } from './events/message-create.event.js';
import { handleReady } from './events/ready.event.js';
import { logger } from './utils/logger.js';

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  client.once(Events.ClientReady, handleReady);
  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteractionCreate(interaction);
  });
  client.on(Events.MessageCreate, (message) => {
    void handleMessageCreate(message);
  });
  client.on(Events.Error, (error) => {
    logger.error({ err: error }, 'Discord client error');
  });
  client.on(Events.Warn, (message) => {
    logger.warn({ message }, 'Discord client warning');
  });

  return client;
}
