import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';

import { ensureAdmin, ensureTargetGuild } from '../guards.js';
import type { SlashCommand } from '../types.js';
import { rankService } from '../../modules/leveling/rank.service.js';
import { formatExp } from '../../utils/format.js';

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lihat leaderboard leveling AML.')
    .addIntegerOption((option) =>
      option.setName('page').setDescription('Halaman leaderboard.').setMinValue(1).setRequired(false)
    ),
  async execute(interaction) {
    if (!(await ensureTargetGuild(interaction)) || !(await ensureAdmin(interaction)) || !interaction.guildId) {
      return;
    }

    const requestedPage = interaction.options.getInteger('page') ?? 1;
    const page = await rankService.getLeaderboardPage(interaction.guildId, requestedPage);

    if (requestedPage > page.totalPages) {
      await interaction.reply({
        content: `Halaman leaderboard hanya tersedia sampai halaman ${page.totalPages}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const description =
      page.entries.length === 0
        ? 'Belum ada user yang memiliki EXP.'
        : page.entries
            .map(
              (entry) =>
                `#${entry.rank} <@${entry.userId}> — Level ${entry.currentLevel} • ${formatExp(entry.totalExp)} EXP`
            )
            .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('AML Leveling Leaderboard')
      .setDescription(description)
      .setColor(0xf2c94c)
      .setFooter({ text: `Page ${page.page}/${page.totalPages} • ${page.totalUsers} users` })
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
