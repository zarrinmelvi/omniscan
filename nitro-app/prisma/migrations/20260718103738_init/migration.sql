-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "pantry_item_id" INTEGER,
ADD COLUMN     "product_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_pantry_item_id_fkey" FOREIGN KEY ("pantry_item_id") REFERENCES "PantryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
