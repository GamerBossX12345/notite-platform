-- CreateEnum
CREATE TYPE "NoteRequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'CLOSED');

-- CreateTable
CREATE TABLE "NoteRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "gradeLevel" INTEGER,
    "status" "NoteRequestStatus" NOT NULL DEFAULT 'OPEN',
    "fulfilledNoteId" TEXT,
    "fulfilledById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteRequest_status_idx" ON "NoteRequest"("status");

-- CreateIndex
CREATE INDEX "NoteRequest_userId_idx" ON "NoteRequest"("userId");

-- AddForeignKey
ALTER TABLE "NoteRequest" ADD CONSTRAINT "NoteRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteRequest" ADD CONSTRAINT "NoteRequest_fulfilledNoteId_fkey" FOREIGN KEY ("fulfilledNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteRequest" ADD CONSTRAINT "NoteRequest_fulfilledById_fkey" FOREIGN KEY ("fulfilledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
