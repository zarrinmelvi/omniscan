-- AlterTable
ALTER TABLE "DietaryProfile" ADD COLUMN     "custom_preferences" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar_base64" TEXT;
