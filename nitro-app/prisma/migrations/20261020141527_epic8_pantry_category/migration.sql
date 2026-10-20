-- AlterTable
ALTER TABLE "PantryItem" ADD COLUMN     "category" TEXT;

-- CreateIndex
CREATE INDEX "PantryItem_category_idx" ON "PantryItem"("category");
