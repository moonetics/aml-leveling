import type { UserLevelStat } from '@prisma/client';

import { appCache, cacheKeys, cacheTtl, type AppCache, type MessageHistoryEntry } from '../../cache/cache.js';
import { MESSAGE_VALIDATION_CONFIG, COMMAND_PREFIXES } from './validation.constants.js';
import type { MessageValidationResult, ValidateMessageInput } from './leveling.types.js';

const URL_REGEX = /https?:\/\/\S+/gi;
const MENTION_REGEX = /<(@!?|@&|#)\d+>/g;
const CUSTOM_EMOJI_REGEX = /<a?:\w+:\d+>/g;
const UNICODE_EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

export class MessageValidationService {
  constructor(private readonly cache: AppCache = appCache) {}

  validateMessage(input: ValidateMessageInput): MessageValidationResult {
    const now = input.now ?? new Date();
    const normalizedContent = normalizeMessageContent(input.content);
    const contentLength = normalizedContent.length;
    const wordCount = getWordCount(normalizedContent);
    const metadata: MessageValidationResult['metadata'] = {
      contentLength,
      wordCount
    };

    const invalid = (reasonCode: string): MessageValidationResult => ({
      isValid: false,
      reasonCode,
      normalizedContent,
      metadata
    });

    if (input.isBot) return invalid('BOT_MESSAGE');
    if (input.isWebhook) return invalid('WEBHOOK_MESSAGE');
    if (input.isDm || !input.guildId) return invalid('NON_GUILD_MESSAGE');
    if (input.guildId !== input.targetGuildId) return invalid('NON_TARGET_GUILD');
    if (!input.settings.enabled) return invalid('LEVELING_DISABLED');
    if (!isChannelEligible(input.channelId, input.channelRules)) return invalid('CHANNEL_NOT_ELIGIBLE');
    if (isCommandMessage(input.content)) return invalid('COMMAND_MESSAGE');
    if (isAttachmentOnly(input.content, input.hasAttachments) && !input.settings.allowAttachmentOnlyExp) {
      return invalid('ATTACHMENT_ONLY');
    }
    if (contentLength < MESSAGE_VALIDATION_CONFIG.minMessageLength) return invalid('TOO_SHORT');
    if (isLinkOnly(input.content) && !input.settings.allowLinkOnlyExp) return invalid('LINK_ONLY');
    if (isEmojiOnly(input.content) && !input.settings.allowEmojiOnlyExp) return invalid('EMOJI_ONLY');
    if (isMentionOnly(input.content)) return invalid('MENTION_ONLY');
    if (isBlacklisted(normalizedContent)) return invalid('BLACKLIST_PATTERN');

    const repeatedCharRatio = getRepeatedCharRatio(normalizedContent);
    metadata.repeatedCharRatio = repeatedCharRatio;
    if (repeatedCharRatio >= MESSAGE_VALIDATION_CONFIG.maxRepeatedCharRatio) {
      return invalid('REPEATED_CHARACTER');
    }

    if (isLowContentSanity(normalizedContent, wordCount)) return invalid('LOW_CONTENT_SANITY');

    const burstCount = this.incrementBurstCounter(input.guildId, input.userId, now);
    metadata.burstCount = burstCount;
    if (burstCount > MESSAGE_VALIDATION_CONFIG.maxMessagesPerBurstWindow) return invalid('BURST_SPAM');

    const shortMessageStreak = this.getShortMessageStreak(input.guildId, input.userId, normalizedContent, now);
    metadata.shortMessageStreak = shortMessageStreak;
    if (shortMessageStreak > MESSAGE_VALIDATION_CONFIG.maxShortMessageStreak) {
      return invalid('LOW_CONTENT_SANITY');
    }

    const duplicateScore = this.getDuplicateScore(input.guildId, input.userId, normalizedContent, now);
    metadata.duplicateScore = duplicateScore;
    if (duplicateScore >= MESSAGE_VALIDATION_CONFIG.duplicateSimilarityThreshold) {
      return invalid('DUPLICATE_MESSAGE');
    }

    if (isCooldownActive(input.userStat, input.guildId, input.userId, input.settings.cooldownSeconds, now, this.cache)) {
      return invalid('COOLDOWN_ACTIVE');
    }

    if (isDailyCapReached(input.userStat, input.settings.timezone, input.settings.dailyExpCap, now)) {
      return invalid('DAILY_CAP_REACHED');
    }

    return {
      isValid: true,
      normalizedContent,
      metadata
    };
  }

  rememberMessage(guildId: string, userId: string, normalizedContent: string, now = new Date()): void {
    const key = cacheKeys.messageHistory(guildId, userId);
    const history = this.cache.messageHistory.get(key) ?? [];
    const freshHistory = history
      .filter(
        (entry) =>
          now.getTime() - entry.createdAt.getTime() <=
          MESSAGE_VALIDATION_CONFIG.duplicateWindowSeconds * 1000
      )
      .slice(-(MESSAGE_VALIDATION_CONFIG.duplicateHistorySize - 1));

    this.cache.messageHistory.set(
      key,
      [...freshHistory, { normalizedContent, createdAt: now }],
      cacheTtl.messageHistoryMs
    );
  }

  private incrementBurstCounter(guildId: string, userId: string, now: Date): number {
    const key = cacheKeys.burstCounter(guildId, userId);
    const counter = this.cache.burstCounters.get(key);

    if (!counter) {
      this.cache.burstCounters.set(
        key,
        { count: 1, windowStartedAt: now },
        MESSAGE_VALIDATION_CONFIG.burstWindowSeconds * 1000
      );
      return 1;
    }

    const count = counter.count + 1;
    this.cache.burstCounters.set(
      key,
      { count, windowStartedAt: counter.windowStartedAt },
      MESSAGE_VALIDATION_CONFIG.burstWindowSeconds * 1000
    );
    return count;
  }

  private getShortMessageStreak(
    guildId: string,
    userId: string,
    normalizedContent: string,
    now: Date
  ): number {
    const history = this.getFreshHistory(guildId, userId, now);
    const recentShortMessages = takeWhile(
      [...history, { normalizedContent, createdAt: now }].reverse(),
      (entry) => entry.normalizedContent.length < MESSAGE_VALIDATION_CONFIG.shortMessageLength
    );

    return recentShortMessages.length;
  }

  private getDuplicateScore(guildId: string, userId: string, normalizedContent: string, now: Date): number {
    const history = this.getFreshHistory(guildId, userId, now);

    return history.reduce((highestScore, entry) => {
      const score =
        entry.normalizedContent === normalizedContent
          ? 1
          : getJaccardSimilarity(entry.normalizedContent, normalizedContent);

      return Math.max(highestScore, score);
    }, 0);
  }

  private getFreshHistory(guildId: string, userId: string, now: Date): MessageHistoryEntry[] {
    const key = cacheKeys.messageHistory(guildId, userId);
    const history = this.cache.messageHistory.get(key) ?? [];

    return history.filter(
      (entry) =>
        now.getTime() - entry.createdAt.getTime() <=
        MESSAGE_VALIDATION_CONFIG.duplicateWindowSeconds * 1000
    );
  }
}

export function normalizeMessageContent(content: string): string {
  return content
    .trim()
    .toLowerCase()
    .replace(/\*\*|__|~~|`/g, '')
    .replace(URL_REGEX, '<url>')
    .replace(MENTION_REGEX, '<mention>')
    .replace(CUSTOM_EMOJI_REGEX, '<emoji>')
    .replace(/\s+/g, ' ')
    .trim();
}

function isChannelEligible(channelId: string | null, channelRules: ValidateMessageInput['channelRules']): boolean {
  if (!channelId) {
    return false;
  }

  const allowedChannels = channelRules
    .filter((rule) => rule.mode === 'allow')
    .map((rule) => rule.channelId);
  const ignoredChannels = channelRules
    .filter((rule) => rule.mode === 'ignore')
    .map((rule) => rule.channelId);

  if (ignoredChannels.includes(channelId)) {
    return false;
  }

  return allowedChannels.length === 0 || allowedChannels.includes(channelId);
}

function isCommandMessage(content: string): boolean {
  const trimmed = content.trim();

  return COMMAND_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) || /^<@!?\d+>\s*\w+/.test(trimmed);
}

function isAttachmentOnly(content: string, hasAttachments: boolean): boolean {
  return hasAttachments && content.trim().length === 0;
}

function isLinkOnly(content: string): boolean {
  const trimmed = content.trim();
  return /^https?:\/\/\S+$/i.test(trimmed);
}

function isEmojiOnly(content: string): boolean {
  const withoutEmoji = content
    .replace(CUSTOM_EMOJI_REGEX, '')
    .replace(UNICODE_EMOJI_REGEX, '')
    .trim();

  return content.trim().length > 0 && withoutEmoji.length === 0;
}

function isMentionOnly(content: string): boolean {
  const withoutMentions = content.replace(MENTION_REGEX, '').trim();
  return content.trim().length > 0 && withoutMentions.length === 0;
}

function isBlacklisted(normalizedContent: string): boolean {
  return (MESSAGE_VALIDATION_CONFIG.blacklistPatterns as readonly string[]).includes(normalizedContent);
}

function getRepeatedCharRatio(content: string): number {
  const compact = content.replace(/\s/g, '');

  if (compact.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const char of compact) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }

  return Math.max(...counts.values()) / compact.length;
}

function isLowContentSanity(normalizedContent: string, wordCount: number): boolean {
  if (wordCount >= MESSAGE_VALIDATION_CONFIG.minWordCount) {
    return false;
  }

  const alphanumericCount = (normalizedContent.match(/[\p{Letter}\p{Number}]/gu) ?? []).length;
  return normalizedContent.length < 10 || alphanumericCount < 4;
}

function getWordCount(normalizedContent: string): number {
  return normalizedContent.split(/\s+/).filter(Boolean).length;
}

function getJaccardSimilarity(a: string, b: string): number {
  const aTokens = new Set(a.split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.split(/\s+/).filter(Boolean));

  if (aTokens.size === 0 && bTokens.size === 0) {
    return 1;
  }

  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;

  return intersection / union;
}

function isCooldownActive(
  userStat: UserLevelStat | null | undefined,
  guildId: string,
  userId: string,
  cooldownSeconds: number,
  now: Date,
  cache: AppCache
): boolean {
  const cachedCooldown = cache.cooldowns.get(cacheKeys.userCooldown(guildId, userId));
  const lastExpGainAt = cachedCooldown ?? userStat?.lastExpGainAt;

  if (!lastExpGainAt) {
    return false;
  }

  return now.getTime() - lastExpGainAt.getTime() < cooldownSeconds * 1000;
}

function isDailyCapReached(
  userStat: UserLevelStat | null | undefined,
  timezone: string,
  dailyExpCap: number,
  now: Date
): boolean {
  if (dailyExpCap <= 0) {
    return false;
  }

  if (!userStat) {
    return false;
  }

  const sameDate =
    userStat.dailyExpDate &&
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(userStat.dailyExpDate) ===
      new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(now);

  return Boolean(sameDate && userStat.dailyExp >= dailyExpCap);
}

function takeWhile<T>(items: T[], predicate: (item: T) => boolean): T[] {
  const result: T[] = [];

  for (const item of items) {
    if (!predicate(item)) {
      break;
    }

    result.push(item);
  }

  return result;
}

export const messageValidationService = new MessageValidationService();
