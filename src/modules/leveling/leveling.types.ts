import type { GuildSetting, UserLevelStat } from '@prisma/client';

export type LevelFormulaResult = {
  level: number;
  currentLevelExp: bigint;
  requiredExpToNextLevel: bigint;
};

export type ExpSource = 'chat' | 'manual' | 'system';

export type GrantChatExpInput = {
  guildId: string;
  userId: string;
  messageId: string;
  channelId: string;
  now?: Date;
  metadata?: Record<string, unknown>;
};

export type ManualExpInput = {
  guildId: string;
  userId: string;
  amount: number;
  actorUserId: string;
  reason?: string;
  now?: Date;
  metadata?: Record<string, unknown>;
};

export type SetExpInput = Omit<ManualExpInput, 'amount'> & {
  amount: number;
};

export type GrantExpResult = {
  granted: boolean;
  source: ExpSource;
  amount: number;
  oldTotalExp: bigint;
  newTotalExp: bigint;
  oldLevel: number;
  newLevel: number;
  levelChanged: boolean;
  dailyCapReached: boolean;
  dailyExpBefore: number;
  dailyExpAfter: number;
  reasonCode?: string;
  stat: UserLevelStat;
};

export type ChannelRuleMode = 'allow' | 'ignore';

export type ChannelRule = {
  channelId: string;
  mode: ChannelRuleMode | string;
};

export type ValidateMessageInput = {
  guildId: string | null;
  targetGuildId: string;
  userId: string;
  channelId: string | null;
  content: string;
  isBot: boolean;
  isWebhook: boolean;
  isDm: boolean;
  hasAttachments: boolean;
  settings: GuildSetting;
  channelRules: ChannelRule[];
  userStat?: UserLevelStat | null;
  now?: Date;
};

export type MessageValidationResult = {
  isValid: boolean;
  reasonCode?: string;
  normalizedContent?: string;
  metadata: {
    contentLength: number;
    wordCount: number;
    duplicateScore?: number;
    repeatedCharRatio?: number;
    burstCount?: number;
    shortMessageStreak?: number;
  };
};

