// This script manually applies the DeviceLogin migration if Prisma migrate doesn't work
// Run with: node prisma/apply_device_migration.js

import { prisma } from '../src/db/prismaClient.js';

async function applyMigration() {
  try {
    console.log('Checking if DeviceLogin table exists...');
    
    // Try to query the table
    const result = await prisma.$queryRaw`SELECT COUNT(*) FROM "DeviceLogin" LIMIT 1`;
    console.log('DeviceLogin table already exists');
    return;
  } catch (err) {
    if (err.code === 'P3015' || err.message.includes('does not exist')) {
      console.log('DeviceLogin table does not exist. Creating...');
      
      try {
        await prisma.$executeRaw`
          CREATE TABLE "DeviceLogin" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "deviceFingerprint" TEXT NOT NULL,
            "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "verifiedAt" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "DeviceLogin_pkey" PRIMARY KEY ("id")
          )
        `;

        await prisma.$executeRaw`
          CREATE UNIQUE INDEX "DeviceLogin_userId_deviceFingerprint_key" ON "DeviceLogin"("userId", "deviceFingerprint")
        `;

        await prisma.$executeRaw`
          CREATE INDEX "DeviceLogin_userId_idx" ON "DeviceLogin"("userId")
        `;

        await prisma.$executeRaw`
          ALTER TABLE "DeviceLogin" ADD CONSTRAINT "DeviceLogin_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
        `;

        console.log('✓ DeviceLogin table created successfully');
      } catch (createErr) {
        console.error('Error creating table:', createErr);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

applyMigration()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
