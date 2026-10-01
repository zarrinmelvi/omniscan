-- AlterTable: Add email verification fields to User model
ALTER TABLE "User" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verification_token" TEXT;
ALTER TABLE "User" ADD COLUMN "verification_token_expires_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "last_verification_sent_at" TIMESTAMP(3);

-- CreateIndex: Unique constraint on verification_token
CREATE UNIQUE INDEX "User_verification_token_key" ON "User"("verification_token");
