import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../database/prisma.js';

type AuditInput = {
  guildId: string;
  actorUserId: string;
  action: string;
  targetUserId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};

export function serializeAuditValue(value: unknown): string | undefined {
  return value === undefined
    ? undefined
    : JSON.stringify(value, (_key, nestedValue: unknown) =>
        typeof nestedValue === 'bigint' ? nestedValue.toString() : nestedValue
      );
}

export class AuditService {
  constructor(private readonly database: PrismaClient = prisma) {}

  async createAuditLog(input: AuditInput) {
    return this.database.auditLog.create({
      data: {
        guildId: input.guildId,
        actorUserId: input.actorUserId,
        action: input.action,
        targetUserId: input.targetUserId,
        before: serializeAuditValue(input.before),
        after: serializeAuditValue(input.after),
        reason: input.reason
      }
    });
  }
}

export const auditService = new AuditService();
