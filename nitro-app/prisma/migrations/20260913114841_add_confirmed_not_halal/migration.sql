-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "confirmed_not_halal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "confirmed_not_halal" BOOLEAN NOT NULL DEFAULT false;
