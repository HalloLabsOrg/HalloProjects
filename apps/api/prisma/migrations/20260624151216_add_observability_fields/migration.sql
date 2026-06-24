-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'VARIABLE_REVEALED';

-- AlterTable
ALTER TABLE "environments" ADD COLUMN     "health_check_url" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "health_check_timeout" INTEGER NOT NULL DEFAULT 10;
