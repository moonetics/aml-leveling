import { type Guild, type GuildMember } from 'discord.js';

import { logger } from '../../utils/logger.js';

export const DEFAULT_MEMBER_ROLE_ID = '1506923623716225094';

export class DefaultMemberRoleService {
  async ensureDefaultRole(member: GuildMember): Promise<boolean> {
    if (member.user.bot || member.roles.cache.has(DEFAULT_MEMBER_ROLE_ID)) {
      return false;
    }

    const role = member.guild.roles.cache.get(DEFAULT_MEMBER_ROLE_ID) ?? (await member.guild.roles.fetch(DEFAULT_MEMBER_ROLE_ID));

    if (!role) {
      throw new Error('DEFAULT_MEMBER_ROLE_NOT_FOUND');
    }

    const botHighestRole = member.guild.members.me?.roles.highest;

    if (!botHighestRole || role.position >= botHighestRole.position) {
      throw new Error('DEFAULT_MEMBER_ROLE_HIERARCHY_TOO_LOW');
    }

    await member.roles.add(role, 'AML default member role');
    return true;
  }

  async ensureDefaultRoleForUser(guild: Guild, userId: string): Promise<boolean> {
    const member = guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));
    return this.ensureDefaultRole(member);
  }

  async safeEnsureDefaultRole(member: GuildMember): Promise<void> {
    try {
      await this.ensureDefaultRole(member);
    } catch (error) {
      logger.warn(
        { err: error, guildId: member.guild.id, userId: member.id, roleId: DEFAULT_MEMBER_ROLE_ID },
        'Failed to ensure default member role'
      );
    }
  }

  async safeEnsureDefaultRoleForUser(guild: Guild, userId: string): Promise<void> {
    try {
      await this.ensureDefaultRoleForUser(guild, userId);
    } catch (error) {
      logger.warn(
        { err: error, guildId: guild.id, userId, roleId: DEFAULT_MEMBER_ROLE_ID },
        'Failed to ensure default member role'
      );
    }
  }
}

export const defaultMemberRoleService = new DefaultMemberRoleService();
