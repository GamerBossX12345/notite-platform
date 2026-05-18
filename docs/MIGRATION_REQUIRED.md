# Admin Device Verification - Setup Instructions

## Issue Encountered
The error `TypeError: Cannot read properties of undefined (reading 'findUnique')` indicates that the Prisma client hasn't been updated with the new `DeviceLogin` model.

## Solution: Apply Database Migration

The feature is now resilient - it will work WITHOUT the migration by gracefully handling the missing table. However, to enable full functionality, you must apply the migration:

### Option 1: Using Prisma CLI (Recommended)
```bash
cd backend
npm run prisma:migrate -- --name add_device_login
```

### Option 2: Using Helper Script
If the Prisma CLI doesn't work:
```bash
cd backend
node prisma/apply_device_migration.js
```

### Option 3: Manual SQL Execution
If both above options fail, connect to your PostgreSQL database and run:
```sql
-- CreateTable
CREATE TABLE "DeviceLogin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceLogin_userId_deviceFingerprint_key" ON "DeviceLogin"("userId", "deviceFingerprint");

-- CreateIndex
CREATE INDEX "DeviceLogin_userId_idx" ON "DeviceLogin"("userId");

-- AddForeignKey
ALTER TABLE "DeviceLogin" ADD CONSTRAINT "DeviceLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add HEAD_ADMIN role if not exists
ALTER TYPE "Role" ADD VALUE 'HEAD_ADMIN' IF NOT EXISTS;

-- Add the role column to User table if it doesn't exist
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'USER';
```

## Current State
✅ Code is implemented and handles missing table gracefully
❌ Database migration not yet applied
⏳ Feature will work in "degraded mode" until migration is applied

## What This Means
- Admins CAN still login normally
- Device verification will be SKIPPED (gracefully) until migration is applied
- Once migration is applied, full device verification will be active
- No data loss or errors will occur

## Next Steps
1. Apply one of the migration methods above
2. Restart the backend server
3. Test admin login to verify device verification is working

## Troubleshooting

### Error: "P3015" or table doesn't exist
This is expected before migration. The code handles it gracefully.

### Error: "relation 'DeviceLogin' does not exist"
Apply the migration using one of the methods above.

### Error: "ALTER TYPE" issues
The Role enum might already have HEAD_ADMIN. The SQL uses IF NOT EXISTS to handle this.

## After Migration
Once applied, the feature is fully active:
- Device fingerprints are created and tracked
- Admin verification emails are sent when needed
- Device verification threshold is configurable
- All features described in DEVICE_VERIFICATION_COMPLETE.md work
