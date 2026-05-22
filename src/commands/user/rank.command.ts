import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction, type User } from 'discord.js';

import { ensureTargetGuild } from '../guards.js';
import type { SlashCommand } from '../types.js';
import { rankService, type UserLevelProfile } from '../../modules/leveling/rank.service.js';
import { buildProgressBar, formatExp, getProgressPercent } from '../../utils/format.js';

function buildRankEmbed(targetUser: User, profile: UserLevelProfile, titlePrefix = 'AML Leveling Profile') {
  const progressBar = buildProgressBar(profile.currentLevelExp, profile.requiredExpToNextLevel, 20);
  const progressPercent = getProgressPercent(profile.currentLevelExp, profile.requiredExpToNextLevel);

  return new EmbedBuilder()
    .setTitle(`${titlePrefix} — ${targetUser.username}`)
    .setColor(0x2f80ed)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: 'Rank', value: profile.rank ? `#${profile.rank}` : 'Belum masuk leaderboard', inline: true },
      { name: 'Level', value: String(profile.currentLevel), inline: true },
      { name: 'Total EXP', value: formatExp(profile.totalExp), inline: true },
      {
        name: 'Progress',
        value: `${progressBar} ${progressPercent}%\n${formatExp(profile.currentLevelExp)} / ${formatExp(
          profile.requiredExpToNextLevel
        )} EXP`,
        inline: false
      }
    );
}

async function executeRankLike(
  interaction: ChatInputCommandInteraction,
  titlePrefix = 'AML Leveling Profile'
): Promise<void> {
  if (!(await ensureTargetGuild(interaction)) || !interaction.guildId) {
    return;
  }

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const profile = await rankService.getUserProfile(interaction.guildId, targetUser.id);

  await interaction.reply({
    embeds: [buildRankEmbed(targetUser, profile, titlePrefix)]
  });
}

export const rankCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Lihat rank dan progress leveling.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User yang ingin dilihat rank-nya.').setRequired(false)
    ),
  execute(interaction) {
    return executeRankLike(interaction);
  }
};

export const levelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Alias dari /rank.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User yang ingin dilihat level-nya.').setRequired(false)
    ),
  execute(interaction) {
    return executeRankLike(interaction);
  }
};

export const profileCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Lihat profile leveling yang lebih detail.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User yang ingin dilihat profile-nya.').setRequired(false)
    ),
  execute(interaction) {
    return executeRankLike(interaction, 'AML Leveling Detail');
  }
};
