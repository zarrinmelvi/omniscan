/*
  Warnings:

  - A unique constraint covering the columns `[external_id]` on the table `Recipe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "external_id" TEXT,
ADD COLUMN     "ingredient_search_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "raw_ingredients" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'kaggle';

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_external_id_key" ON "Recipe"("external_id");
