-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "canonical_key" TEXT,
ADD COLUMN     "canonical_product_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "inactivity_warning_sent_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_canonical_key_idx" ON "Product"("canonical_key");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_canonical_product_id_fkey" FOREIGN KEY ("canonical_product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
