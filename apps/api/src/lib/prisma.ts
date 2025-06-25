import { PrismaClient } from '@prisma/client';
import { config } from '@resume-vita/config';

// Add global typing for development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Singleton pattern for Prisma Client
export const prisma = globalThis.__prisma ??
  new PrismaClient({
    log: config.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.env.DATABASE_URL,
      },
    },
    errorFormat: 'pretty',
  });

// Prevent multiple instances in development
if (config.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;