import type { Client } from 'discord.js';

import { getEnv } from '../../config/env.js';
import { leaderboardService } from './leaderboard.service.js';
import { logger } from '../../utils/logger.js';

let interval: NodeJS.Timeout | undefined;

export function startLeaderboardScheduler(client: Client): void {
  const env = getEnv();

  stopLeaderboardScheduler();

  const update = () => {
    void leaderboardService.updateGuildLeaderboard(env.DISCORD_GUILD_ID, client).catch((error) => {
      logger.error({ err: error }, 'Scheduled leaderboard update failed');
    });
  };

  interval = setInterval(update, env.LEADERBOARD_UPDATE_INTERVAL_SECONDS * 1000);
  setTimeout(update, 5_000);
}

export function stopLeaderboardScheduler(): void {
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
}

