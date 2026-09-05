/*
  Warnings:

  - The primary key for the `FlaggedScan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `RecipeIngredient` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[logo_image]` on the table `HalalLogo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `Allergen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `DietaryProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `admin_correction` to the `FlaggedScan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `flag_reason` to the `FlaggedScan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `FlaggedScan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `FlaggedScan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `IngredientMapping` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `PantryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Scan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_product_id_fkey";

-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_recipe_id_fkey";

-- AlterTable
ALTER TABLE "Allergen" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "is_predefined" SET DEFAULT false;

-- AlterTable
ALTER TABLE "DietaryProfile" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "halal_pref" SET DEFAULT false;

-- AlterTable
ALTER TABLE "FlaggedScan" DROP CONSTRAINT "FlaggedScan_pkey",
ADD COLUMN     "admin_correction" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "flag_reason" TEXT NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "FlaggedScan_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "HalalLogo" ALTER COLUMN "is_accredited" SET DEFAULT false;

-- AlterTable
ALTER TABLE "IngredientMapping" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "is_read" SET DEFAULT false,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PantryItem" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "is_archived" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "is_verified" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Scan" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "RecipeIngredient";

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" SERIAL NOT NULL,
    "quantity_needed" DECIMAL(65,30) NOT NULL,
    "unit" TEXT NOT NULL,
    "recipe_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HalalLogo_logo_image_key" ON "HalalLogo"("logo_image");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
