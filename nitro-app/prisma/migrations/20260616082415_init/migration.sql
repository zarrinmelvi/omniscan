/*
  Warnings:

  - You are about to drop the column `authorId` on the `DietaryProfile` table. All the data in the column will be lost.
  - Added the required column `userId` to the `DietaryProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DietaryProfile" DROP CONSTRAINT "DietaryProfile_authorId_fkey";

-- AlterTable
ALTER TABLE "DietaryProfile" DROP COLUMN "authorId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "DietaryProfile" ADD CONSTRAINT "DietaryProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
