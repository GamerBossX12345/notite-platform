// Prisma Client singleton.
// Importă `prisma` oriunde ai nevoie de DB. O singură instanță = un singur pool de conexiuni.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
