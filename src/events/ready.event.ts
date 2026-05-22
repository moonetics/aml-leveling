import type { Client } from 'discord.js';

import { getEnv } from '../config/env.js';
import { startLeaderboardScheduler } from '../modules/leveling/leaderboard.scheduler.js';
import { logger } from '../utils/logger.js';

export function handleReady(client: Client<true>): void {
  const env = getEnv();

  logger.info(
    {
      botTag: client.user.tag,
      botId: client.user.id,
      guildCount: client.guilds.cache.size,
      targetGuildId: env.DISCORD_GUILD_ID
    },
    'AML Leveling bot is ready'
  );

  startLeaderboardScheduler(client);
}
