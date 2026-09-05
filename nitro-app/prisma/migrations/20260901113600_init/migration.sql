-- DropForeignKey
ALTER TABLE "FlaggedScan" DROP CONSTRAINT "FlaggedScan_admin_id_fkey";

-- AlterTable
ALTER TABLE "FlaggedScan" ALTER COLUMN "admin_id" DROP NOT NULL,
ALTER COLUMN "admin_correction" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AddForeignKey
ALTER TABLE "FlaggedScan" ADD CONSTRAINT "FlaggedScan_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
