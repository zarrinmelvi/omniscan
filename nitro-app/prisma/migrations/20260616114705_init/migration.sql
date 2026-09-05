/*
  Warnings:

  - You are about to drop the column `userId` on the `DietaryProfile` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `User` table. All the data in the column will be lost.
  - Added the required column `user_id` to the `DietaryProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DietaryProfile" DROP CONSTRAINT "DietaryProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "DietaryProfile" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "password_hash",
ADD COLUMN     "password" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "IngredientMapping" (
    "id" SERIAL NOT NULL,
    "scientific_term" TEXT NOT NULL,
    "simplified_term" TEXT NOT NULL,
    "allergen_id" INTEGER NOT NULL,

    CONSTRAINT "IngredientMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "portions_guide" JSONB NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" SERIAL NOT NULL,
    "quantity_needed" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "brand_name" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "ingredient_text" TEXT NOT NULL,
    "simplified_ingredients" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "halal_logo_id" INTEGER NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HalalLogo" (
    "id" SERIAL NOT NULL,
    "certifying_body" TEXT NOT NULL,
    "logo_image" TEXT NOT NULL,
    "is_accredited" BOOLEAN NOT NULL,

    CONSTRAINT "HalalLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PantryItem" (
    "id" SERIAL NOT NULL,
    "expiration_date" TIMESTAMP(3) NOT NULL,
    "best_before_date" TIMESTAMP(3) NOT NULL,
    "storage_location" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "portion_unit" TEXT NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL,
    "is_archived" BOOLEAN NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "PantryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scan" (
    "id" SERIAL NOT NULL,
    "image_url" TEXT NOT NULL,
    "scan_time" TIMESTAMP(3) NOT NULL,
    "ai_confidence_score" DECIMAL(65,30) NOT NULL,
    "safety_verdict" TEXT NOT NULL,
    "flag_reason" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlaggedScan" (
    "id" SERIAL NOT NULL,
    "scan_id" INTEGER NOT NULL,
    "admin_id" INTEGER NOT NULL,

    CONSTRAINT "FlaggedScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientMapping_scientific_term_key" ON "IngredientMapping"("scientific_term");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- AddForeignKey
ALTER TABLE "DietaryProfile" ADD CONSTRAINT "DietaryProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngredientMapping" ADD CONSTRAINT "IngredientMapping_allergen_id_fkey" FOREIGN KEY ("allergen_id") REFERENCES "Allergen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_halal_logo_id_fkey" FOREIGN KEY ("halal_logo_id") REFERENCES "HalalLogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PantryItem" ADD CONSTRAINT "PantryItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scan" ADD CONSTRAINT "Scan_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlaggedScan" ADD CONSTRAINT "FlaggedScan_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "Scan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlaggedScan" ADD CONSTRAINT "FlaggedScan_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
