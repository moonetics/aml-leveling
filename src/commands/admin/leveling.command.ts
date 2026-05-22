import {
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction
} from 'discord.js';

import { ensureAdmin, ensureTargetGuild } from '../guards.js';
import type { SlashCommand } from '../types.js';
import { prisma } from '../../database/prisma.js';
import {
  adminOperationsService,
  RESET_ALL_CONFIRM_TEXT,
  type AdminLogEntry
} from '../../modules/admin/admin-operations.service.js';
import { guildSettingsService } from '../../modules/guild-settings/guild-settings.service.js';
import { leaderboardService } from '../../modules/leveling/leaderboard.service.js';
import { roleRewardService } from '../../modules/leveling/role-reward.service.js';
import { formatDiscordTimestamp, formatExp } from '../../utils/format.js';
import { isValidTimeZone } from '../../utils/timezone.js';

function getGuildId(interaction: ChatInputCommandInteraction): string {
  if (!interaction.guildId) {
    throw new Error('Guild interaction required');
  }

  return interaction.guildId;
}

async function viewConfig(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = getGuildId(interaction);
  const [settings, channelRules] = await Promise.all([
    guildSettingsService.ensureGuildSettings(guildId),
    prisma.guildExpChannel.findMany({ where: { guildId }, orderBy: [{ mode: 'asc' }, { channelId: 'asc' }] })
  ]);
  const allowed = channelRules.filter((rule) => rule.mode === 'allow').map((rule) => `<#${rule.channelId}>`);
  const ignored = channelRules.filter((rule) => rule.mode === 'ignore').map((rule) => `<#${rule.channelId}>`);
  const dailyCapText = settings.dailyExpCap > 0 ? String(settings.dailyExpCap) : 'Disabled / Unlimited';

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [
      new EmbedBuilder()
        .setTitle('AML Leveling Config')
        .setColor(0x56ccf2)
        .addFields(
          { name: 'Enabled', value: settings.enabled ? 'Yes' : 'No', inline: true },
          { name: 'EXP Range', value: `${settings.minExp}-${settings.maxExp}`, inline: true },
          { name: 'Cooldown', value: `${settings.cooldownSeconds}s`, inline: true },
          { name: 'Daily Cap', value: dailyCapText, inline: true },
          { name: 'Timezone', value: settings.timezone, inline: true },
          { name: 'Role Rewards', value: 'Static highest_only', inline: true },
          {
            name: 'Leaderboard',
            value: settings.leaderboardEnabled
              ? `Enabled di <#${settings.leaderboardChannelId}>`
              : 'Disabled',
            inline: false
          },
          {
            name: 'Level-Up History',
            value: settings.levelUpChannelId ? `<#${settings.levelUpChannelId}>` : 'Disabled',
            inline: false
          },
          { name: 'Allowed Channels', value: allowed.join(', ') || '-', inline: false },
          { name: 'Ignored Channels', value: ignored.join(', ') || '-', inline: false }
        )
    ]
  });
}

async function replySuccess(interaction: ChatInputCommandInteraction, content: string): Promise<void> {
  await interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

async function handleChannels(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const channel = interaction.options.getChannel('channel', true, [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement
  ]);
  const guildId = getGuildId(interaction);
  const mode = subcommand.startsWith('allow') ? 'allow' : 'ignore';

  if (subcommand.endsWith('add')) {
    await guildSettingsService.addChannelRule(guildId, interaction.user.id, channel.id, mode);
    await replySuccess(interaction, `<#${channel.id}> ditambahkan ke ${mode} list.`);
    return;
  }

  const removed = await guildSettingsService.removeChannelRule(guildId, interaction.user.id, channel.id, mode);
  await replySuccess(
    interaction,
    removed ? `<#${channel.id}> dihapus dari ${mode} list.` : `<#${channel.id}> tidak ada di ${mode} list.`
  );
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const guildId = getGuildId(interaction);

  if (subcommand === 'set-channel') {
    const channel = interaction.options.getChannel('channel', true, [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement
    ]);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await leaderboardService.configureChannel(guildId, channel.id, interaction.user.id, interaction.client);
    await interaction.editReply(`Leaderboard diaktifkan di <#${channel.id}>.`);
    return;
  }

  if (subcommand === 'refresh') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await leaderboardService.updateGuildLeaderboard(guildId, interaction.client);
    await interaction.editReply('Leaderboard direfresh.');
    return;
  }

  await leaderboardService.disable(guildId, interaction.user.id, 'admin command');
  await replySuccess(interaction, 'Leaderboard dinonaktifkan.');
}

async function handleHistory(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const guildId = getGuildId(interaction);

  if (subcommand === 'set-channel') {
    const channel = interaction.options.getChannel('channel', true, [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement
    ]);

    await guildSettingsService.updateLevelUpChannel(guildId, interaction.user.id, channel.id);
    await replySuccess(interaction, `Level-up history diaktifkan di <#${channel.id}>.`);
    return;
  }

  await guildSettingsService.disableLevelUpChannel(guildId, interaction.user.id);
  await replySuccess(interaction, 'Level-up history dinonaktifkan. Bot tidak akan mengirim notifikasi level-up.');
}

async function handleDailyCap(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const guildId = getGuildId(interaction);

  if (subcommand === 'enable') {
    const amount = interaction.options.getInteger('amount', true);
    await guildSettingsService.updateDailyCap(guildId, interaction.user.id, amount);
    await replySuccess(interaction, `Daily EXP cap diaktifkan: ${amount} EXP per user per hari.`);
    return;
  }

  await guildSettingsService.updateDailyCap(guildId, interaction.user.id, 0);
  await replySuccess(interaction, 'Daily EXP cap dinonaktifkan. Chat EXP tidak punya batas harian.');
}

async function handleRoles(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  if (!interaction.guild) {
    await replySuccess(interaction, 'Command ini harus digunakan di server.');
    return;
  }

  if (subcommand === 'list') {
    const rewards = await roleRewardService.listRewards();
    const description =
      rewards.length === 0
        ? 'Belum ada role reward yang dikonfigurasi.'
        : rewards
            .map((reward) => `Level ${reward.requiredLevel} (${reward.range}) → <@&${reward.roleId}>`)
            .join('\n');

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        new EmbedBuilder()
          .setTitle('AML Leveling Role Rewards')
          .setDescription(description)
          .setColor(0x27ae60)
      ]
    });
    return;
  }

  if (subcommand === 'sync') {
    const user = interaction.options.getUser('user', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await roleRewardService.syncUserRewards(interaction.guild, user.id);
    await interaction.editReply(
      result.skipped
        ? `Sync dilewati untuk <@${user.id}>: ${result.reason ?? 'unknown'}.`
        : `Sync selesai untuk <@${user.id}>. Added: ${result.addedRoleIds.length}, removed: ${result.removedRoleIds.length}.`
    );
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const results = await roleRewardService.syncAllUsersWithStats(interaction.guild);
  const synced = results.filter((result) => !result.skipped).length;
  await interaction.editReply(`Sync-all selesai. Diproses: ${results.length}, synced: ${synced}.`);
}

async function handleExp(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const guildId = getGuildId(interaction);
  const user = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const reason = interaction.options.getString('reason') ?? undefined;

  if (!interaction.guild) {
    await replySuccess(interaction, 'Command ini harus digunakan di server.');
    return;
  }

  if (amount < 0) {
    await replySuccess(interaction, 'Amount tidak boleh negatif.');
    return;
  }

  const result =
    subcommand === 'add'
      ? await adminOperationsService.addManualExpWithAudit({
          guildId,
          userId: user.id,
          amount,
          actorUserId: interaction.user.id,
          reason,
          guild: interaction.guild
        })
      : subcommand === 'remove'
        ? await adminOperationsService.removeManualExpWithAudit({
            guildId,
            userId: user.id,
            amount,
            actorUserId: interaction.user.id,
            reason,
            guild: interaction.guild
          })
        : await adminOperationsService.setManualExpWithAudit({
            guildId,
            userId: user.id,
            amount,
            actorUserId: interaction.user.id,
            reason,
            guild: interaction.guild
          });

  const syncNote = result.roleSyncFailed ? '\nRole reward sync gagal, cek log bot.' : '';
  await replySuccess(
    interaction,
    `<@${user.id}> sekarang Level ${result.exp.newLevel} dengan ${formatExp(result.exp.newTotalExp)} total EXP. Perubahan: ${formatExp(result.exp.amount)} EXP.${syncNote}`
  );
}

async function handleReset(interaction: ChatInputCommandInteraction, subcommand: string): Promise<void> {
  const guildId = getGuildId(interaction);
  const reason = interaction.options.getString('reason') ?? undefined;

  if (subcommand === 'user') {
    const user = interaction.options.getUser('user', true);
    const result = await adminOperationsService.resetUser({
      guildId,
      userId: user.id,
      actorUserId: interaction.user.id,
      reason
    });

    await replySuccess(
      interaction,
      `<@${user.id}> direset ke Level ${result.after.currentLevel} / ${formatExp(result.after.totalExp)} EXP. History EXP tetap disimpan.`
    );
    return;
  }

  const confirmText = interaction.options.getString('confirm_text', true);

  try {
    const result = await adminOperationsService.resetAll({
      guildId,
      actorUserId: interaction.user.id,
      confirmText,
      reason
    });

    await replySuccess(
      interaction,
      `Reset all selesai. Backup SQLite sangat disarankan sebelum menjalankan aksi ini di production.\nDeleted stats: ${result.deletedUserStats}, EXP events: ${result.deletedExpEvents}, invalid events: ${result.deletedInvalidMessageEvents}. Config, rewards, leaderboard, dan audit logs tetap disimpan.`
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'RESET_CONFIRMATION_MISMATCH') {
      await replySuccess(interaction, `Confirm text harus persis: ${RESET_ALL_CONFIRM_TEXT}`);
      return;
    }

    throw error;
  }
}

function formatLogEntry(entry: AdminLogEntry, index: number): string {
  const actor = entry.actorUserId ? `<@${entry.actorUserId}>` : '-';
  const subject = entry.userId ? `<@${entry.userId}>` : entry.targetUserId ? `<@${entry.targetUserId}>` : '-';

  if (entry.type === 'exp') {
    return `${index}. ${formatDiscordTimestamp(entry.createdAt)} EXP ${entry.amount ?? 0} | ${subject} | ${entry.oldLevel}→${entry.newLevel} | ${formatExp(entry.oldTotalExp ?? 0n)}→${formatExp(entry.newTotalExp ?? 0n)} | actor ${actor}`;
  }

  return `${index}. ${formatDiscordTimestamp(entry.createdAt)} AUDIT ${entry.action} | target ${subject} | actor ${actor}`;
}

async function handleLogs(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = getGuildId(interaction);
  const page = interaction.options.getInteger('page') ?? 1;
  const limit = interaction.options.getInteger('limit') ?? 10;
  const user = interaction.options.getUser('user');
  const logs = await adminOperationsService.getAdminLogs({
    guildId,
    page,
    limit,
    userId: user?.id
  });
  const startIndex = (logs.page - 1) * logs.limit;
  const description =
    logs.entries.length === 0
      ? 'Belum ada log untuk filter ini.'
      : logs.entries.map((entry, index) => formatLogEntry(entry, startIndex + index + 1)).join('\n');

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [
      new EmbedBuilder()
        .setTitle('AML Leveling Logs')
        .setDescription(description)
        .setColor(0xf2c94c)
        .setFooter({
          text: `Page ${logs.page}/${logs.totalPages} • Total ${logs.totalCount} • Limit ${logs.limit}`
        })
    ]
  });
}

export const levelingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('leveling')
    .setDescription('Konfigurasi sistem AML Leveling.')
    .addSubcommandGroup((group) =>
      group
        .setName('config')
        .setDescription('Lihat konfigurasi leveling.')
        .addSubcommand((subcommand) =>
          subcommand.setName('view').setDescription('Lihat konfigurasi leveling aktif.')
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('enable').setDescription('Aktifkan leveling.'))
    .addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Nonaktifkan leveling.'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set-exp')
        .setDescription('Atur EXP minimum dan maksimum.')
        .addIntegerOption((option) =>
          option.setName('min').setDescription('EXP minimum.').setMinValue(0).setRequired(true)
        )
        .addIntegerOption((option) =>
          option.setName('max').setDescription('EXP maksimum.').setMinValue(0).setMaxValue(1000).setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set-cooldown')
        .setDescription('Atur cooldown EXP.')
        .addIntegerOption((option) =>
          option.setName('seconds').setDescription('Cooldown dalam detik.').setMinValue(5).setMaxValue(3600).setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set-daily-cap')
        .setDescription('Atur daily EXP cap.')
        .addIntegerOption((option) =>
          option
            .setName('amount')
            .setDescription('Daily cap. 0 berarti cap disabled/unlimited.')
            .setMinValue(0)
            .setMaxValue(1_000_000)
            .setRequired(true)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('daily-cap')
        .setDescription('Aktifkan atau nonaktifkan daily EXP cap.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('enable')
            .setDescription('Aktifkan daily EXP cap.')
            .addIntegerOption((option) =>
              option
                .setName('amount')
                .setDescription('Batas EXP per user per hari.')
                .setMinValue(1)
                .setMaxValue(1_000_000)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('disable').setDescription('Nonaktifkan daily EXP cap.')
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('set-timezone')
        .setDescription('Atur timezone reset harian.')
        .addStringOption((option) =>
          option.setName('timezone').setDescription('Timezone IANA, contoh Asia/Jakarta.').setRequired(true)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('channels')
        .setDescription('Atur channel EXP.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('allow-add')
            .setDescription('Tambahkan channel ke allow list.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('allow-remove')
            .setDescription('Hapus channel dari allow list.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('ignore-add')
            .setDescription('Tambahkan channel ke ignore list.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('ignore-remove')
            .setDescription('Hapus channel dari ignore list.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('leaderboard')
        .setDescription('Atur leaderboard otomatis.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('set-channel')
            .setDescription('Aktifkan leaderboard di channel.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
        .addSubcommand((subcommand) => subcommand.setName('refresh').setDescription('Refresh leaderboard sekarang.'))
        .addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Nonaktifkan leaderboard.'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('history')
        .setDescription('Atur channel history level-up.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('set-channel')
            .setDescription('Aktifkan level-up history di channel.')
            .addChannelOption((option) => option.setName('channel').setDescription('Channel.').setRequired(true))
        )
        .addSubcommand((subcommand) => subcommand.setName('disable').setDescription('Nonaktifkan level-up history.'))
    )
    .addSubcommandGroup((group) =>
      group
        .setName('roles')
        .setDescription('Lihat dan sync static role reward leveling.')
        .addSubcommand((subcommand) => subcommand.setName('list').setDescription('Lihat static role reward.'))
        .addSubcommand((subcommand) =>
          subcommand
            .setName('sync')
            .setDescription('Sync role reward user.')
            .addUserOption((option) => option.setName('user').setDescription('User.').setRequired(true))
        )
        .addSubcommand((subcommand) =>
          subcommand.setName('sync-all').setDescription('Sync role reward semua user yang punya data leveling.')
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('exp')
        .setDescription('Koreksi EXP user.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('add')
            .setDescription('Tambahkan EXP manual ke user.')
            .addUserOption((option) => option.setName('user').setDescription('User.').setRequired(true))
            .addIntegerOption((option) =>
              option.setName('amount').setDescription('Jumlah EXP.').setMinValue(0).setRequired(true)
            )
            .addStringOption((option) => option.setName('reason').setDescription('Alasan koreksi.'))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('remove')
            .setDescription('Kurangi EXP manual dari user.')
            .addUserOption((option) => option.setName('user').setDescription('User.').setRequired(true))
            .addIntegerOption((option) =>
              option.setName('amount').setDescription('Jumlah EXP.').setMinValue(0).setRequired(true)
            )
            .addStringOption((option) => option.setName('reason').setDescription('Alasan koreksi.'))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('set')
            .setDescription('Set total EXP user.')
            .addUserOption((option) => option.setName('user').setDescription('User.').setRequired(true))
            .addIntegerOption((option) =>
              option.setName('amount').setDescription('Total EXP baru.').setMinValue(0).setRequired(true)
            )
            .addStringOption((option) => option.setName('reason').setDescription('Alasan koreksi.'))
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('reset')
        .setDescription('Reset data leveling.')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('user')
            .setDescription('Reset data leveling satu user.')
            .addUserOption((option) => option.setName('user').setDescription('User.').setRequired(true))
            .addStringOption((option) => option.setName('reason').setDescription('Alasan reset.'))
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('all')
            .setDescription('Reset semua stats dan event leveling.')
            .addStringOption((option) =>
              option
                .setName('confirm_text')
                .setDescription(`Ketik persis: ${RESET_ALL_CONFIRM_TEXT}`)
                .setRequired(true)
            )
            .addStringOption((option) => option.setName('reason').setDescription('Alasan reset.'))
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('logs')
        .setDescription('Lihat audit dan EXP logs.')
        .addIntegerOption((option) =>
          option.setName('page').setDescription('Halaman log.').setMinValue(1).setRequired(false)
        )
        .addIntegerOption((option) =>
          option.setName('limit').setDescription('Jumlah log per halaman.').setMinValue(1).setMaxValue(25)
        )
        .addUserOption((option) => option.setName('user').setDescription('Filter user.'))
    ),
  async execute(interaction) {
    if (!(await ensureTargetGuild(interaction)) || !(await ensureAdmin(interaction))) {
      return;
    }

    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();
    const guildId = getGuildId(interaction);

    if (group === 'config' && subcommand === 'view') {
      await viewConfig(interaction);
      return;
    }

    if (group === 'channels') {
      await handleChannels(interaction, subcommand);
      return;
    }

    if (group === 'leaderboard') {
      await handleLeaderboard(interaction, subcommand);
      return;
    }

    if (group === 'history') {
      await handleHistory(interaction, subcommand);
      return;
    }

    if (group === 'daily-cap') {
      await handleDailyCap(interaction, subcommand);
      return;
    }

    if (group === 'roles') {
      await handleRoles(interaction, subcommand);
      return;
    }

    if (group === 'exp') {
      await handleExp(interaction, subcommand);
      return;
    }

    if (group === 'reset') {
      await handleReset(interaction, subcommand);
      return;
    }

    if (subcommand === 'logs') {
      await handleLogs(interaction);
      return;
    }

    if (subcommand === 'enable' || subcommand === 'disable') {
      const enabled = subcommand === 'enable';
      await guildSettingsService.updateEnabled(guildId, interaction.user.id, enabled);
      await replySuccess(interaction, `Leveling ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
      return;
    }

    if (subcommand === 'set-exp') {
      const min = interaction.options.getInteger('min', true);
      const max = interaction.options.getInteger('max', true);

      if (max < min) {
        await replySuccess(interaction, 'EXP maksimum harus lebih besar atau sama dengan EXP minimum.');
        return;
      }

      await guildSettingsService.updateExpRange(guildId, interaction.user.id, min, max);
      await replySuccess(interaction, `EXP per chat diatur ke ${min}-${max}.`);
      return;
    }

    if (subcommand === 'set-cooldown') {
      const seconds = interaction.options.getInteger('seconds', true);
      await guildSettingsService.updateCooldown(guildId, interaction.user.id, seconds);
      await replySuccess(interaction, `Cooldown EXP diatur ke ${seconds} detik.`);
      return;
    }

    if (subcommand === 'set-daily-cap') {
      const amount = interaction.options.getInteger('amount', true);
      await guildSettingsService.updateDailyCap(guildId, interaction.user.id, amount);
      await replySuccess(
        interaction,
        amount > 0
          ? `Daily EXP cap diatur ke ${amount}.`
          : 'Daily EXP cap dinonaktifkan. Chat EXP tidak punya batas harian.'
      );
      return;
    }

    if (subcommand === 'set-timezone') {
      const timezone = interaction.options.getString('timezone', true);

      if (!isValidTimeZone(timezone)) {
        await replySuccess(interaction, 'Timezone tidak valid. Gunakan format IANA seperti Asia/Jakarta.');
        return;
      }

      await guildSettingsService.updateTimezone(guildId, interaction.user.id, timezone);
      await replySuccess(interaction, `Timezone diatur ke ${timezone}.`);
    }
  }
};
