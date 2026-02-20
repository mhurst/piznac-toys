-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Figure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "toyLineId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Figure_toyLineId_fkey" FOREIGN KEY ("toyLineId") REFERENCES "ToyLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Figure_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Figure" ("createdAt", "id", "name", "notes", "seriesId", "toyLineId", "updatedAt", "year") SELECT "createdAt", "id", "name", "notes", "seriesId", "toyLineId", "updatedAt", "year" FROM "Figure";
DROP TABLE "Figure";
ALTER TABLE "new_Figure" RENAME TO "Figure";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
