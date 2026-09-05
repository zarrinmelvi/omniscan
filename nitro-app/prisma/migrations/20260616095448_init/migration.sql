-- CreateTable
CREATE TABLE "Allergen" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "scientific_name" TEXT NOT NULL,
    "is_predefined" BOOLEAN NOT NULL,

    CONSTRAINT "Allergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAllergen" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "allergenId" INTEGER NOT NULL,

    CONSTRAINT "UserAllergen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Allergen_name_key" ON "Allergen"("name");

-- AddForeignKey
ALTER TABLE "UserAllergen" ADD CONSTRAINT "UserAllergen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAllergen" ADD CONSTRAINT "UserAllergen_allergenId_fkey" FOREIGN KEY ("allergenId") REFERENCES "Allergen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
