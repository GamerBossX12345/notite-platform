-- CreateEnum
CREATE TYPE "TeacherVerificationMethod" AS ENUM ('EMAIL_DOMAIN', 'INVITE_CODE', 'DOCUMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "NoteValidationVerdict" AS ENUM ('CORRECT', 'INCORRECT');

-- AlterTable
ALTER TABLE "TeacherRequest" ADD COLUMN     "documentUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teacherVerificationMethod" "TeacherVerificationMethod";

-- CreateTable
CREATE TABLE "TeacherInviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TeacherInviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherInviteCodeRedemption" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherInviteCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteValidation" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "verdict" "NoteValidationVerdict" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInviteCode_code_key" ON "TeacherInviteCode"("code");

-- CreateIndex
CREATE INDEX "TeacherInviteCode_createdById_idx" ON "TeacherInviteCode"("createdById");

-- CreateIndex
CREATE INDEX "TeacherInviteCodeRedemption_userId_idx" ON "TeacherInviteCodeRedemption"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInviteCodeRedemption_codeId_userId_key" ON "TeacherInviteCodeRedemption"("codeId", "userId");

-- CreateIndex
CREATE INDEX "NoteValidation_noteId_idx" ON "NoteValidation"("noteId");

-- CreateIndex
CREATE INDEX "NoteValidation_teacherId_idx" ON "NoteValidation"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "NoteValidation_noteId_teacherId_key" ON "NoteValidation"("noteId", "teacherId");

-- AddForeignKey
ALTER TABLE "TeacherInviteCode" ADD CONSTRAINT "TeacherInviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherInviteCodeRedemption" ADD CONSTRAINT "TeacherInviteCodeRedemption_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "TeacherInviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherInviteCodeRedemption" ADD CONSTRAINT "TeacherInviteCodeRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteValidation" ADD CONSTRAINT "NoteValidation_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteValidation" ADD CONSTRAINT "NoteValidation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
