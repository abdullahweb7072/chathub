-- AlterTable
ALTER TABLE "User" ADD COLUMN     "friendRequestNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationPreview" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notificationSound" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "readReceipts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLastSeen" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showOnlineStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "typingIndicator" BOOLEAN NOT NULL DEFAULT true;
