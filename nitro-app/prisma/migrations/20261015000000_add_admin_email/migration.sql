-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
