/*
  Warnings:

  - You are about to drop the column `image_based64` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image_based64",
ADD COLUMN     "image_base64" TEXT;
