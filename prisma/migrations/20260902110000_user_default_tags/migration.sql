-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "defaultTags" TEXT NOT NULL DEFAULT '',
    "membership" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "bio", "createdAt", "email", "handle", "id", "membership", "name", "passwordHash", "updatedAt") SELECT "avatarUrl", "bio", "createdAt", "email", "handle", "id", "membership", "name", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

