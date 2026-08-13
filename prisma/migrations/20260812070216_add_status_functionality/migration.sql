-- CreateEnum
CREATE TYPE "StatusMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "StatusMediaType",
    "mediaName" TEXT,
    "backgroundColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusViewer" (
    "id" SERIAL NOT NULL,
    "statusId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusViewer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Status_userId_idx" ON "Status"("userId");

-- CreateIndex
CREATE INDEX "Status_expiresAt_idx" ON "Status"("expiresAt");

-- CreateIndex
CREATE INDEX "Status_userId_expiresAt_idx" ON "Status"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "StatusViewer_statusId_idx" ON "StatusViewer"("statusId");

-- CreateIndex
CREATE INDEX "StatusViewer_userId_idx" ON "StatusViewer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StatusViewer_statusId_userId_key" ON "StatusViewer"("statusId", "userId");

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusViewer" ADD CONSTRAINT "StatusViewer_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusViewer" ADD CONSTRAINT "StatusViewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
