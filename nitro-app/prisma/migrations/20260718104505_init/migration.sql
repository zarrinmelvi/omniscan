-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_halal_logo_id_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "halal_logo_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
