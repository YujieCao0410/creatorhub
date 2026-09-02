-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "videoUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "captions" JSONB NOT NULL DEFAULT '{}',
    "youtubeUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "shareToCommunity" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "captions", "content", "coverImageUrl", "createdAt", "excerpt", "id", "published", "publishedAt", "slug", "tags", "title", "updatedAt", "videoUrl", "youtubeUrl") SELECT "authorId", "captions", "content", "coverImageUrl", "createdAt", "excerpt", "id", "published", "publishedAt", "slug", "tags", "title", "updatedAt", "videoUrl", "youtubeUrl" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_published_publishedAt_idx" ON "Post"("published", "publishedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT '',
    "defaultTags" TEXT NOT NULL DEFAULT '',
    "aiUsedCount" INTEGER NOT NULL DEFAULT 0,
    "aiUsedMonth" TEXT NOT NULL DEFAULT '',
    "membership" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("aiUsedCount", "aiUsedMonth", "avatarUrl", "bio", "createdAt", "defaultTags", "email", "handle", "id", "membership", "name", "passwordHash", "updatedAt") SELECT "aiUsedCount", "aiUsedMonth", "avatarUrl", "bio", "createdAt", "defaultTags", "email", "handle", "id", "membership", "name", "passwordHash", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;


-- Keep already-published posts visible in the community feed; new posts opt in.
UPDATE "Post" SET "shareToCommunity" = true WHERE "published" = true;
