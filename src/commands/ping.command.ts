import { MessageFlags, SlashCommandBuilder } from 'discord.js';

import type { SlashCommand } from './types.js';

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check whether AML Leveling is online.'),
  async execute(interaction) {
    await interaction.reply({
      content: `Pong! WebSocket latency: ${interaction.client.ws.ping}ms.`,
      flags: MessageFlags.Ephemeral
    });
  }
};

