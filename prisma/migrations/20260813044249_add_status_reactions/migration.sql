-- CreateTable
CREATE TABLE "StatusReaction" (
    "id" SERIAL NOT NULL,
    "statusId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatusReaction_statusId_idx" ON "StatusReaction"("statusId");

-- CreateIndex
CREATE INDEX "StatusReaction_userId_idx" ON "StatusReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusReaction_statusId_userId_key" ON "StatusReaction"("statusId", "userId");

-- AddForeignKey
ALTER TABLE "StatusReaction" ADD CONSTRAINT "StatusReaction_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusReaction" ADD CONSTRAINT "StatusReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
