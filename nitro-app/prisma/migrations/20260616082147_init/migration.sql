/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Blog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Recipe` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `created_at` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_active` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notification_pref` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password_hash` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "last_active" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "notification_pref" JSONB NOT NULL,
ADD COLUMN     "password_hash" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL;

-- DropTable
DROP TABLE "Blog";

-- DropTable
DROP TABLE "Recipe";

-- CreateTable
CREATE TABLE "DietaryProfile" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "halal_pref" BOOLEAN NOT NULL,

    CONSTRAINT "DietaryProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DietaryProfile" ADD CONSTRAINT "DietaryProfile_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
