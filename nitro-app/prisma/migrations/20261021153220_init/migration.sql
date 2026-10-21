-- AlterTable
ALTER TABLE "HalalLogo" ADD COLUMN     "country" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_checked_at" TIMESTAMP(3),
ADD COLUMN     "logo_base64" TEXT,
ADD COLUMN     "pending_logo_base64" TEXT;
