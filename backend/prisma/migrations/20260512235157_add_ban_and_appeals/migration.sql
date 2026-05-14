-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AppealResolution" AS ENUM ('UPHELD', 'OVERTURNED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "banCommentId" TEXT,
ADD COLUMN     "banNoteId" TEXT,
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BanAppeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "openedById" TEXT,
    "openedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" "AppealResolution",
    "adminResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BanAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BanAppeal_userId_idx" ON "BanAppeal"("userId");

-- CreateIndex
CREATE INDEX "BanAppeal_status_idx" ON "BanAppeal"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_banNoteId_fkey" FOREIGN KEY ("banNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_banCommentId_fkey" FOREIGN KEY ("banCommentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanAppeal" ADD CONSTRAINT "BanAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanAppeal" ADD CONSTRAINT "BanAppeal_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BanAppeal" ADD CONSTRAINT "BanAppeal_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
