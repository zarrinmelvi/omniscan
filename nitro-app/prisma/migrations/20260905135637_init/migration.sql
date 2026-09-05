-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" SERIAL NOT NULL,
    "brand_name" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "ingredient_text" TEXT NOT NULL,
    "simplified_ingredients" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "match_key" TEXT NOT NULL,
    "halal_logo_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogIngredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CatalogIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProductIngredient" (
    "id" SERIAL NOT NULL,
    "catalog_product_id" INTEGER NOT NULL,
    "catalog_ingredient_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "CatalogProductIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_match_key_key" ON "CatalogProduct"("match_key");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogIngredient_name_key" ON "CatalogIngredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProductIngredient_catalog_product_id_catalog_ingredi_key" ON "CatalogProductIngredient"("catalog_product_id", "catalog_ingredient_id");

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_catalog_product_id_fkey" FOREIGN KEY ("catalog_product_id") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProductIngredient" ADD CONSTRAINT "CatalogProductIngredient_catalog_ingredient_id_fkey" FOREIGN KEY ("catalog_ingredient_id") REFERENCES "CatalogIngredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
