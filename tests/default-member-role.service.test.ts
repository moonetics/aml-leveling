import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_MEMBER_ROLE_ID, DefaultMemberRoleService } from '../src/modules/roles/default-member-role.service.js';

function createMember(hasDefaultRole = false) {
  const defaultRole = { id: DEFAULT_MEMBER_ROLE_ID, position: 1 };
  const botRole = { id: 'bot-role', position: 10 };
  const add = vi.fn(async () => undefined);
  const member = {
    id: 'user-1',
    user: { bot: false },
    roles: {
      cache: {
        has: vi.fn((roleId: string) => roleId === DEFAULT_MEMBER_ROLE_ID && hasDefaultRole)
      },
      add
    },
    guild: {
      id: 'guild-1',
      members: {
        me: {
          roles: {
            highest: botRole
          }
        },
        cache: new Map(),
        fetch: vi.fn()
      },
      roles: {
        cache: new Map([[DEFAULT_MEMBER_ROLE_ID, defaultRole]]),
        fetch: vi.fn(async () => defaultRole)
      }
    }
  };

  return { member, add, defaultRole };
}

describe('DefaultMemberRoleService', () => {
  it('adds the default role when a member does not have it', async () => {
    const service = new DefaultMemberRoleService();
    const { member, add, defaultRole } = createMember(false);

    await expect(service.ensureDefaultRole(member as never)).resolves.toBe(true);

    expect(add).toHaveBeenCalledWith(defaultRole, 'AML default member role');
  });

  it('skips members who already have the default role', async () => {
    const service = new DefaultMemberRoleService();
    const { member, add } = createMember(true);

    await expect(service.ensureDefaultRole(member as never)).resolves.toBe(false);

    expect(add).not.toHaveBeenCalled();
  });
});
