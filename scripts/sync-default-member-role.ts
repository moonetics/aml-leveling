import { Client, GatewayIntentBits } from 'discord.js';

import { getEnv } from '../src/config/env.js';
import {
  DEFAULT_MEMBER_ROLE_ID,
  defaultMemberRoleService
} from '../src/modules/roles/default-member-role.service.js';

async function main(): Promise<void> {
  const env = getEnv();
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

  try {
    await client.login(env.DISCORD_TOKEN);
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    await guild.roles.fetch();
    await guild.members.fetch();
    await guild.members.fetchMe();

    const members = guild.members.cache.filter(
      (member) => !member.user.bot && !member.roles.cache.has(DEFAULT_MEMBER_ROLE_ID)
    );
    const added: string[] = [];
    const failed: Array<{ userId: string; reason: string }> = [];

    for (const member of members.values()) {
      try {
        const didAdd = await defaultMemberRoleService.ensureDefaultRole(member);

        if (didAdd) {
          added.push(member.id);
        }
      } catch (error) {
        failed.push({
          userId: member.id,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          guildId: guild.id,
          roleId: DEFAULT_MEMBER_ROLE_ID,
          scanned: guild.members.cache.filter((member) => !member.user.bot).size,
          added,
          failed
        },
        null,
        2
      )
    );

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    client.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
