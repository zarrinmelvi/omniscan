-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "session_token" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "session_token" TEXT;
