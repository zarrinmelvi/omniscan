-- DropIndex
DROP INDEX "recipe_ingredient_search_trgm_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "image_base64_back" TEXT;

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "image_url_back" TEXT;
