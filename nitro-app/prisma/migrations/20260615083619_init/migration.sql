-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "product_id" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_product_id_key" ON "Recipe"("product_id");
