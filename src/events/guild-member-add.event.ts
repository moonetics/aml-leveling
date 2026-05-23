import type { GuildMember } from 'discord.js';

import { getEnv } from '../config/env.js';
import { defaultMemberRoleService } from '../modules/roles/default-member-role.service.js';
import { logger } from '../utils/logger.js';

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    const env = getEnv();

    if (member.guild.id !== env.DISCORD_GUILD_ID) {
      return;
    }

    await defaultMemberRoleService.safeEnsureDefaultRole(member);
  } catch (error) {
    logger.error(
      {
        err: error,
        guildId: member.guild.id,
        userId: member.id
      },
      'Failed to process guildMemberAdd default role flow'
    );
  }
}
