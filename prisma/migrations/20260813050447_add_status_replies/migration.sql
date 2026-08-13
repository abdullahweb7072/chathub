-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "statusId" INTEGER;

-- CreateIndex
CREATE INDEX "Message_statusId_idx" ON "Message"("statusId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;
