import { describe, expect, it, vi } from 'vitest';

import { NotificationService } from '../src/modules/leveling/notification.service.js';
import type { GrantExpResult } from '../src/modules/leveling/leveling.types.js';

const result = {
  oldLevel: 2,
  newLevel: 5,
  newTotalExp: 1234n
} as GrantExpResult;

function createMessage(overrides: Record<string, unknown> = {}) {
  return {
    guildId: 'guild-1',
    author: { id: 'user-1' },
    guild: null,
    channel: {
      isTextBased: () => true,
      send: vi.fn()
    },
    ...overrides
  };
}

describe('NotificationService', () => {
  it('sends one level-up message to the configured history channel', async () => {
    const historySend = vi.fn();
    const service = new NotificationService({
      ensureGuildSettings: vi.fn(async () => ({ levelUpChannelId: 'history-channel-1' }))
    } as never);
    const historyChannel = {
      isTextBased: () => true,
      send: historySend
    };
    const message = createMessage({
      guild: {
        id: 'guild-1',
        channels: {
          cache: new Map([['history-channel-1', historyChannel]]),
          fetch: vi.fn()
        }
      }
    });

    await service.sendLevelUpNotification(message as never, result, {
      userId: 'user-1',
      addedRoleIds: ['role-5'],
      removedRoleIds: [],
      skipped: false
    });

    expect(historySend).toHaveBeenCalledOnce();
    expect(message.channel.send).not.toHaveBeenCalled();
  });

  it('does not send a level-up message when history channel is not configured', async () => {
    const service = new NotificationService({
      ensureGuildSettings: vi.fn(async () => ({ levelUpChannelId: null }))
    } as never);
    const message = createMessage({
      guild: {
        id: 'guild-1',
        channels: {
          cache: new Map(),
          fetch: vi.fn()
        }
      }
    });

    await service.sendLevelUpNotification(message as never, result, {
      userId: 'user-1',
      addedRoleIds: ['role-5'],
      removedRoleIds: [],
      skipped: false
    });

    expect(message.channel.send).not.toHaveBeenCalled();
  });

  it('does not throw when the configured history channel is missing', async () => {
    const service = new NotificationService({
      ensureGuildSettings: vi.fn(async () => ({ levelUpChannelId: 'missing-channel' }))
    } as never);
    const message = createMessage({
      guild: {
        id: 'guild-1',
        channels: {
          cache: new Map(),
          fetch: vi.fn(async () => null)
        }
      }
    });

    await expect(
      service.sendLevelUpNotification(message as never, result, {
        userId: 'user-1',
        addedRoleIds: ['role-5'],
        removedRoleIds: [],
        skipped: false
      })
    ).resolves.toBeUndefined();
    expect(message.channel.send).not.toHaveBeenCalled();
  });
});
