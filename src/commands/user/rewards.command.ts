import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import { ensureTargetGuild } from '../guards.js';
import type { SlashCommand } from '../types.js';
import { roleRewardService } from '../../modules/leveling/role-reward.service.js';

export const rewardsCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('rewards').setDescription('Lihat daftar role reward leveling.'),
  async execute(interaction) {
    if (!(await ensureTargetGuild(interaction)) || !interaction.guildId) {
      return;
    }

    const rewards = await roleRewardService.listRewards();
    const description =
      rewards.length === 0
        ? 'Belum ada role reward yang dikonfigurasi.'
        : rewards
            .map((reward) => `Level ${reward.requiredLevel} (${reward.range}) → <@&${reward.roleId}>`)
            .join('\n');

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('AML Leveling Rewards')
          .setDescription(description)
          .setColor(0x27ae60)
      ]
    });
  }
};
