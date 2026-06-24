-- DropIndex
DROP INDEX "templates_slug_key";

-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "preview_image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_version_key" ON "templates"("slug", "version");

