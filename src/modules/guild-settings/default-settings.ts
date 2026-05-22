export const DEFAULT_GUILD_SETTINGS = {
  enabled: true,
  minExp: 5,
  maxExp: 10,
  cooldownSeconds: 20,
  dailyExpCap: 500,
  timezone: 'Asia/Jakarta',
  leaderboardEnabled: false,
  leaderboardTopLimit: 10,
  roleRewardMode: 'cumulative',
  allowLinkOnlyExp: false,
  allowEmojiOnlyExp: false,
  allowAttachmentOnlyExp: false
} as const;

export function buildDefaultGuildSettingsCreateInput(guildId: string) {
  return {
    guildId,
    ...DEFAULT_GUILD_SETTINGS
  };
}
