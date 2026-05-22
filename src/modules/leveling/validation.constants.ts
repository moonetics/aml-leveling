export const MESSAGE_VALIDATION_CONFIG = {
  minMessageLength: 5,
  minWordCount: 2,
  duplicateHistorySize: 5,
  duplicateWindowSeconds: 300,
  duplicateSimilarityThreshold: 0.9,
  burstWindowSeconds: 15,
  maxMessagesPerBurstWindow: 5,
  shortMessageLength: 8,
  maxShortMessageStreak: 3,
  maxRepeatedCharRatio: 0.7,
  blacklistPatterns: ['test', 'tes', 'asdf', 'qwerty', '12345', 'aaaa', '....', '????']
} as const;

export const COMMAND_PREFIXES = ['!', '?', '/'] as const;

