-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "variant_group" TEXT;

-- CreateIndex
CREATE INDEX "CatalogProduct_variant_group_idx" ON "CatalogProduct"("variant_group");
