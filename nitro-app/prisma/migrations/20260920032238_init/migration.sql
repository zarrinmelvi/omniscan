-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN     "halal_unverified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "halal_unverified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductHalalLogo" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "halal_logo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ProductHalalLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProductHalalLogo" (
    "id" SERIAL NOT NULL,
    "catalog_product_id" INTEGER NOT NULL,
    "halal_logo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CatalogProductHalalLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductHalalLogo_product_id_halal_logo_id_key" ON "ProductHalalLogo"("product_id", "halal_logo_id");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProductHalalLogo_catalog_product_id_halal_logo_id_key" ON "CatalogProductHalalLogo"("catalog_product_id", "halal_logo_id");

-- AddForeignKey
ALTER TABLE "ProductHalalLogo" ADD CONSTRAINT "ProductHalalLogo_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductHalalLogo" ADD CONSTRAINT "ProductHalalLogo_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductHalalLogo" ADD CONSTRAINT "CatalogProductHalalLogo_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductHalalLogo" ADD CONSTRAINT "CatalogProductHalalLogo_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
