-- AlterTable
ALTER TABLE "Figure" ADD COLUMN     "subSeriesId" INTEGER;

-- CreateTable
CREATE TABLE "SubSeries" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubSeries_seriesId_slug_key" ON "SubSeries"("seriesId", "slug");

-- AddForeignKey
ALTER TABLE "SubSeries" ADD CONSTRAINT "SubSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Figure" ADD CONSTRAINT "Figure_subSeriesId_fkey" FOREIGN KEY ("subSeriesId") REFERENCES "SubSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
