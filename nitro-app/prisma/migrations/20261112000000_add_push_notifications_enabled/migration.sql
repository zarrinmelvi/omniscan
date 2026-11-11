-- AlterTable: add push notification preference; existing rows default to true
ALTER TABLE "User" ADD COLUMN "push_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;
