/*
  Warnings:

  - The primary key for the `FlaggedScan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `FlaggedScan` table. All the data in the column will be lost.
  - The primary key for the `RecipeIngredient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `RecipeIngredient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FlaggedScan" DROP CONSTRAINT "FlaggedScan_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "FlaggedScan_pkey" PRIMARY KEY ("scan_id", "admin_id");

-- AlterTable
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipe_id", "product_id");
