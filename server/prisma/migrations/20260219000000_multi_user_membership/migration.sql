-- CreateTable: User (replaces Admin)
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migrate Admin data to User
INSERT INTO "User" ("id", "email", "password", "role", "createdAt", "updatedAt")
SELECT "id", "email", "password", 'ADMIN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Admin";

-- Create unique index on User.email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- DropTable: Admin
DROP TABLE "Admin";

-- RedefineTables for Figure (add userId column)
CREATE TABLE "new_Figure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "toyLineId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Figure_toyLineId_fkey" FOREIGN KEY ("toyLineId") REFERENCES "ToyLine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Figure_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Figure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Figure" ("id", "name", "year", "notes", "owned", "toyLineId", "seriesId", "userId", "createdAt", "updatedAt")
SELECT "id", "name", "year", "notes", "owned", "toyLineId", "seriesId", 1, "createdAt", "updatedAt"
FROM "Figure";

DROP TABLE "Figure";
ALTER TABLE "new_Figure" RENAME TO "Figure";

-- RedefineTables for Photo (add userId column)
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "figureId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Photo_figureId_fkey" FOREIGN KEY ("figureId") REFERENCES "Figure" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Photo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Photo" ("id", "filename", "isPrimary", "figureId", "userId")
SELECT "id", "filename", "isPrimary", "figureId", 1
FROM "Photo";

DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";

-- CreateTable: Invite
CREATE TABLE "Invite" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "createdById" INTEGER NOT NULL,
    "usedById" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invite_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");
CREATE UNIQUE INDEX "Invite_usedById_key" ON "Invite"("usedById");
