-- CreateIndex
CREATE INDEX "Comment_noteId_createdAt_idx" ON "Comment"("noteId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Note_hidden_createdAt_idx" ON "Note"("hidden", "createdAt");
