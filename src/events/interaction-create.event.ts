import type { Interaction } from 'discord.js';

import { commandCollection } from '../commands/index.js';
import { replyWithSafeError } from '../utils/interaction.js';
import { logger } from '../utils/logger.js';

export async function handleInteractionCreate(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commandCollection.get(interaction.commandName);

  if (!command) {
    logger.warn({ commandName: interaction.commandName }, 'Unknown slash command received');
    await replyWithSafeError(interaction, 'Command tidak dikenali oleh bot.');
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(
      {
        err: error,
        commandName: interaction.commandName,
        guildId: interaction.guildId,
        userId: interaction.user.id
      },
      'Slash command execution failed'
    );
    await replyWithSafeError(interaction);
  }
}

