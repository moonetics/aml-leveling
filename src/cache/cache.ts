export type CacheValue<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache<K, V> {
  private readonly store = new Map<K, CacheValue<V>>();

  get(key: K): V | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    this.pruneExpired();
    return this.store.size;
  }

  private pruneExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}

export type MessageHistoryEntry = {
  normalizedContent: string;
  createdAt: Date;
};

export type BurstCounter = {
  count: number;
  windowStartedAt: Date;
};

export class AppCache {
  readonly guildSettings = new TtlCache<string, unknown>();
  readonly cooldowns = new TtlCache<string, Date>();
  readonly messageHistory = new TtlCache<string, MessageHistoryEntry[]>();
  readonly burstCounters = new TtlCache<string, BurstCounter>();
  readonly rankCache = new TtlCache<string, number>();

  private readonly leaderboardLocks = new Set<string>();

  acquireLeaderboardLock(guildId: string): boolean {
    if (this.leaderboardLocks.has(guildId)) {
      return false;
    }

    this.leaderboardLocks.add(guildId);
    return true;
  }

  releaseLeaderboardLock(guildId: string): void {
    this.leaderboardLocks.delete(guildId);
  }

  clear(): void {
    this.guildSettings.clear();
    this.cooldowns.clear();
    this.messageHistory.clear();
    this.burstCounters.clear();
    this.rankCache.clear();
    this.leaderboardLocks.clear();
  }
}

export const appCache = new AppCache();

export const cacheKeys = {
  guildSettings: (guildId: string) => `guild_settings:${guildId}`,
  userCooldown: (guildId: string, userId: string) => `user_cooldown:${guildId}:${userId}`,
  messageHistory: (guildId: string, userId: string) => `message_history:${guildId}:${userId}`,
  burstCounter: (guildId: string, userId: string) => `burst_counter:${guildId}:${userId}`,
  rank: (guildId: string, userId: string) => `rank_cache:${guildId}:${userId}`
};

export const cacheTtl = {
  guildSettingsMs: 5 * 60 * 1000,
  messageHistoryMs: 5 * 60 * 1000,
  burstCounterMs: 15 * 1000,
  rankMs: 60 * 1000
};

