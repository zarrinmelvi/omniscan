-- DropForeignKey
ALTER TABLE "CatalogProductHalalLogo" DROP CONSTRAINT "CatalogProductHalalLogo_catalog_product_id_fkey";

-- DropForeignKey
ALTER TABLE "CatalogProductHalalLogo" DROP CONSTRAINT "CatalogProductHalalLogo_halal_logo_id_fkey";

-- DropForeignKey
ALTER TABLE "CatalogProductIngredient" DROP CONSTRAINT "CatalogProductIngredient_catalog_ingredient_id_fkey";

-- DropForeignKey
ALTER TABLE "CatalogProductIngredient" DROP CONSTRAINT "CatalogProductIngredient_catalog_product_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductHalalLogo" DROP CONSTRAINT "ProductHalalLogo_halal_logo_id_fkey";

-- DropForeignKey
ALTER TABLE "ProductHalalLogo" DROP CONSTRAINT "ProductHalalLogo_product_id_fkey";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "HalalLogo" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" SERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER,
    "triggered_by_user_id" INTEGER,
    "triggered_by_admin_id" INTEGER,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditEvent_created_at_idx" ON "AuditEvent"("created_at");

-- CreateIndex
CREATE INDEX "AuditEvent_event_type_idx" ON "AuditEvent"("event_type");

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_catalog_ingredient_id_fkey" FOREIGN KEY ("catalog_ingredient_id") REFERENCES "CatalogIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHalalLogo" ADD CONSTRAINT "ProductHalalLogo_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHalalLogo" ADD CONSTRAINT "ProductHalalLogo_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductHalalLogo" ADD CONSTRAINT "CatalogProductHalalLogo_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductHalalLogo" ADD CONSTRAINT "CatalogProductHalalLogo_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
