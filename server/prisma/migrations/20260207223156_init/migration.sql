-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ToyLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverImage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "toyLineId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Series_toyLineId_fkey" FOREIGN KEY ("toyLineId") REFERENCES "ToyLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "toyLineId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tag_toyLineId_fkey" FOREIGN KEY ("toyLineId") REFERENCES "ToyLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Figure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,
    "toyLineId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Figure_toyLineId_fkey" FOREIGN KEY ("toyLineId") REFERENCES "ToyLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Figure_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FigureTag" (
    "figureId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    PRIMARY KEY ("figureId", "tagId"),
    CONSTRAINT "FigureTag_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FigureTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Accessory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "figureId" INTEGER NOT NULL,
    CONSTRAINT "Accessory_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "figureId" INTEGER NOT NULL,
    CONSTRAINT "Photo_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ToyLine_name_key" ON "ToyLine"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ToyLine_slug_key" ON "ToyLine"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Series_toyLineId_slug_key" ON "Series"("toyLineId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_toyLineId_name_key" ON "Tag"("toyLineId", "name");
