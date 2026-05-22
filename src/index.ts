import { createDiscordClient } from './client.js';
import { getEnv } from './config/env.js';
import { prisma } from './database/prisma.js';
import { stopLeaderboardScheduler } from './modules/leveling/leaderboard.scheduler.js';
import { logger } from './utils/logger.js';

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  logger.info({ signal }, 'Shutting down AML Leveling bot');

  stopLeaderboardScheduler();
  await prisma.$disconnect();
  process.exit(exitCode);
}

async function main(): Promise<void> {
  const env = getEnv();
  const client = createDiscordClient();

  process.once('SIGINT', () => {
    client.destroy();
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    client.destroy();
    void shutdown('SIGTERM');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    client.destroy();
    void shutdown('uncaughtException', 1);
  });

  await client.login(env.DISCORD_TOKEN);
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start AML Leveling bot');
  process.exit(1);
});
