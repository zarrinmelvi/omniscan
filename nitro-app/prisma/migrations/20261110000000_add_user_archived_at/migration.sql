-- AlterTable
ALTER TABLE "User" ADD COLUMN "archived_at" TIMESTAMP(3);

-- Backfill: legacy ARCHIVED users get a full 7-day grace period from now
UPDATE "User" SET "archived_at" = NOW() WHERE "status" = 'ARCHIVED' AND "archived_at" IS NULL;
