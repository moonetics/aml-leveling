import { MessageFlags, type ChatInputCommandInteraction, type InteractionReplyOptions } from 'discord.js';

import { logger } from './logger.js';

export async function replyWithSafeError(
  interaction: ChatInputCommandInteraction,
  message = 'Terjadi kesalahan saat memproses command. Silakan coba lagi atau hubungi admin.'
): Promise<void> {
  try {
    const payload: InteractionReplyOptions = {
      content: message,
      flags: MessageFlags.Ephemeral
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
      return;
    }

    await interaction.reply(payload);
  } catch (error) {
    logger.error({ err: error }, 'Failed to send safe interaction error response');
  }
}
