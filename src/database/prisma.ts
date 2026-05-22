import { PrismaClient, type Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type TransactionClient = Prisma.TransactionClient;

export async function withTransaction<T>(
  callback: (transaction: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}
