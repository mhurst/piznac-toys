-- CreateTable
CREATE TABLE "PriceCache" (
    "id" SERIAL NOT NULL,
    "figureId" INTEGER NOT NULL,
    "searchQuery" TEXT NOT NULL,
    "avgPrice" DOUBLE PRECISION,
    "lowPrice" DOUBLE PRECISION,
    "highPrice" DOUBLE PRECISION,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_figureId_key" ON "PriceCache"("figureId");

-- AddForeignKey
ALTER TABLE "PriceCache" ADD CONSTRAINT "PriceCache_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
