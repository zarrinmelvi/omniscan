/*
  Warnings:

  - You are about to drop the `UserAllergen` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserAllergen" DROP CONSTRAINT "UserAllergen_allergenId_fkey";

-- DropForeignKey
ALTER TABLE "UserAllergen" DROP CONSTRAINT "UserAllergen_userId_fkey";

-- DropTable
DROP TABLE "UserAllergen";

-- CreateTable
CREATE TABLE "_user_allergens" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_user_allergens_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_user_allergens_B_index" ON "_user_allergens"("B");

-- AddForeignKey
ALTER TABLE "_user_allergens" ADD CONSTRAINT "_user_allergens_A_fkey" FOREIGN KEY ("A") REFERENCES "Allergen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_allergens" ADD CONSTRAINT "_user_allergens_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
