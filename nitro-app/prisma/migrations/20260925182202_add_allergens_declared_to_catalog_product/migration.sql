-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "allergens_declared" TEXT[] DEFAULT ARRAY[]::TEXT[];
