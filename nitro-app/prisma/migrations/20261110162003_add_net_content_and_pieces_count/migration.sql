-- AlterTable
ALTER TABLE "PantryItem" ADD COLUMN     "net_content" DECIMAL(65,30),
ADD COLUMN     "net_unit" TEXT,
ADD COLUMN     "pieces_count" INTEGER NOT NULL DEFAULT 1;
