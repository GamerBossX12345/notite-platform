/**
 * Creează contul HEAD_ADMIN o singură dată.
 * Rulează cu: node prisma/create_head_admin.js
 *
 * Setează variabilele înainte de rulare:
 *   HEAD_ADMIN_EMAIL=...
 *   HEAD_ADMIN_USERNAME=...
 *   HEAD_ADMIN_PASSWORD=...
 * Sau editează valorile implicite de mai jos.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const EMAIL    = process.env.HEAD_ADMIN_EMAIL    || 'headadmin@notite.ro';
const USERNAME = process.env.HEAD_ADMIN_USERNAME  || 'headadmin';
const PASSWORD = process.env.HEAD_ADMIN_PASSWORD  || 'schimba_parola_imediat!';

if (PASSWORD === 'schimba_parola_imediat!') {
  console.warn('⚠  Folosești parola implicită. Setează HEAD_ADMIN_PASSWORD înainte de producție!');
}

const existing = await prisma.user.findFirst({
  where: { role: 'HEAD_ADMIN' },
});

if (existing) {
  console.log(`Head admin există deja: ${existing.username} (${existing.email})`);
  await prisma.$disconnect();
  process.exit(0);
}

const passwordHash = await bcrypt.hash(PASSWORD, 12);

const user = await prisma.user.create({
  data: {
    email: EMAIL,
    username: USERNAME,
    passwordHash,
    name: 'Head Administrator',
    role: 'HEAD_ADMIN',
  },
  select: { id: true, email: true, username: true, role: true },
});

console.log('Head admin creat:');
console.log(`  Email:    ${user.email}`);
console.log(`  Username: ${user.username}`);
console.log(`  Rol:      ${user.role}`);

await prisma.$disconnect();
