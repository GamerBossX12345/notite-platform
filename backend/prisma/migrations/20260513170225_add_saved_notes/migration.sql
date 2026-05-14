-- CreateTable
CREATE TABLE "SavedNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedNote_userId_idx" ON "SavedNote"("userId");

-- CreateIndex
CREATE INDEX "SavedNote_noteId_idx" ON "SavedNote"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedNote_userId_noteId_key" ON "SavedNote"("userId", "noteId");

-- AddForeignKey
ALTER TABLE "SavedNote" ADD CONSTRAINT "SavedNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedNote" ADD CONSTRAINT "SavedNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
