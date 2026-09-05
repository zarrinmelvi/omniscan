-- AlterTable
ALTER TABLE "PantryItem" ALTER COLUMN "expiration_date" DROP NOT NULL,
ALTER COLUMN "best_before_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "image_based64" TEXT;
