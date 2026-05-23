import { EmbedBuilder, MessageFlags, SlashCommandBuilder, type ChatInputCommandInteraction, type User } from 'discord.js';

import { ensureTargetGuild } from '../guards.js';
import type { SlashCommand } from '../types.js';
import { commandUsageService, type ProfileCheckCommandName } from '../../modules/commands/command-usage.service.js';
import { rankService, type UserLevelProfile } from '../../modules/leveling/rank.service.js';
import { buildProgressBar, formatExp, getProgressPercent } from '../../utils/format.js';

const LEVEL_COMMAND_COOLDOWN_MS = 90 * 1000;
const levelCommandCooldowns = new Map<string, number>();

function buildRankEmbed(targetUser: User, profile: UserLevelProfile, titlePrefix = 'AML Leveling Profile') {
  const progressBar = buildProgressBar(profile.currentLevelExp, profile.requiredExpToNextLevel, 20);
  const progressPercent = getProgressPercent(profile.currentLevelExp, profile.requiredExpToNextLevel);

  return new EmbedBuilder()
    .setTitle(`${titlePrefix} — ${targetUser.username}`)
    .setColor(0x2f80ed)
    .setThumbnail(targetUser.displayAvatarURL())
    .addFields(
      { name: 'Rank', value: '#?', inline: true },
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

function getCooldownKey(interaction: ChatInputCommandInteraction): string {
  return `${interaction.guildId ?? 'dm'}:${interaction.user.id}`;
}

async function enforceLevelCommandCooldown(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const now = Date.now();
  const key = getCooldownKey(interaction);
  const expiresAt = levelCommandCooldowns.get(key);

  if (expiresAt && expiresAt > now) {
    const remainingSeconds = Math.ceil((expiresAt - now) / 1000);

    await interaction.reply({
      content: `Tunggu ${remainingSeconds} detik lagi sebelum pakai /level lagi.`,
      flags: MessageFlags.Ephemeral
    });
    return false;
  }

  levelCommandCooldowns.set(key, now + LEVEL_COMMAND_COOLDOWN_MS);
  return true;
}

async function executeRankLike(
  interaction: ChatInputCommandInteraction,
  titlePrefix = 'AML Leveling Profile',
  commandName: ProfileCheckCommandName
): Promise<void> {
  if (!(await ensureTargetGuild(interaction)) || !interaction.guildId) {
    return;
  }

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const profile = await rankService.getUserProfile(interaction.guildId, targetUser.id);
  await commandUsageService.recordProfileCheck({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    commandName,
    targetUserId: targetUser.id
  });

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
    return executeRankLike(interaction, 'AML Leveling Profile', 'rank');
  }
};

export const levelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Alias dari /rank.')
    .addUserOption((option) =>
      option.setName('user').setDescription('User yang ingin dilihat level-nya.').setRequired(false)
    ),
  async execute(interaction) {
    if (!(await enforceLevelCommandCooldown(interaction))) {
      return;
    }

    return executeRankLike(interaction, 'AML Leveling Profile', 'level');
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
    return executeRankLike(interaction, 'AML Leveling Detail', 'profile');
  }
};
