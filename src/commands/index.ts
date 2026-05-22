import { Collection } from 'discord.js';

import { levelingCommand } from './admin/leveling.command.js';
import { pingCommand } from './ping.command.js';
import type { SlashCommand } from './types.js';
import { leaderboardCommand } from './user/leaderboard.command.js';
import { levelCommand, profileCommand, rankCommand } from './user/rank.command.js';
import { rewardsCommand } from './user/rewards.command.js';

export const commands: readonly SlashCommand[] = [
  pingCommand,
  rankCommand,
  levelCommand,
  profileCommand,
  leaderboardCommand,
  rewardsCommand,
  levelingCommand
];

export const commandCollection = new Collection<string, SlashCommand>();

for (const command of commands) {
  commandCollection.set(command.data.name, command);
}
