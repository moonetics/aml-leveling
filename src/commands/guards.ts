import { MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';

import { getEnv } from '../config/env.js';

export async function ensureTargetGuild(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const env = getEnv();

  if (interaction.guildId === env.DISCORD_GUILD_ID) {
    return true;
  }

  await interaction.reply({
    content: 'Command ini hanya tersedia di server AML.',
    flags: MessageFlags.Ephemeral
  });
  return false;
}

export async function ensureAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const memberPermissions = interaction.memberPermissions;

  if (memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  await interaction.reply({
    content: 'Kamu membutuhkan permission Manage Server untuk menggunakan command ini.',
    flags: MessageFlags.Ephemeral
  });
  return false;
}

