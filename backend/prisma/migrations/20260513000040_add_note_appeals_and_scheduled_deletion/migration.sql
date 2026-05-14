-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "deletionReason" TEXT,
ADD COLUMN     "deletionScheduledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NoteAppeal" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
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

    CONSTRAINT "NoteAppeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteAppeal_noteId_idx" ON "NoteAppeal"("noteId");

-- CreateIndex
CREATE INDEX "NoteAppeal_status_idx" ON "NoteAppeal"("status");

-- AddForeignKey
ALTER TABLE "NoteAppeal" ADD CONSTRAINT "NoteAppeal_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteAppeal" ADD CONSTRAINT "NoteAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteAppeal" ADD CONSTRAINT "NoteAppeal_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteAppeal" ADD CONSTRAINT "NoteAppeal_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
