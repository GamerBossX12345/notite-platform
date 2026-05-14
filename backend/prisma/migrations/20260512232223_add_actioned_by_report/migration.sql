-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "actionedAt" TIMESTAMP(3),
ADD COLUMN     "actionedById" TEXT;

-- CreateIndex
CREATE INDEX "Report_actionedById_idx" ON "Report"("actionedById");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_actionedById_fkey" FOREIGN KEY ("actionedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
