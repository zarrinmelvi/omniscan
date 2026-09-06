/*
  Warnings:

  - You are about to drop the column `certifying_body` on the `HalalLogo` table. All the data in the column will be lost.
  - You are about to drop the column `logo_image` on the `HalalLogo` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[certifier]` on the table `HalalLogo` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `certifier` to the `HalalLogo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `HalalLogo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `image_path` to the `HalalLogo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scraped_date` to the `HalalLogo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_url` to the `HalalLogo` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "HalalLogo_logo_image_key";

-- AlterTable
ALTER TABLE "HalalLogo" DROP COLUMN "certifying_body",
DROP COLUMN "logo_image",
ADD COLUMN     "certifier" TEXT NOT NULL,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "image_path" TEXT NOT NULL,
ADD COLUMN     "scraped_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "source_url" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "HalalLogo_certifier_key" ON "HalalLogo"("certifier");
