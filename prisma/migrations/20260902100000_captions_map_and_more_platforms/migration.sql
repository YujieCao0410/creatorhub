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
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("authorId", "content", "coverImageUrl", "createdAt", "excerpt", "id", "published", "publishedAt", "slug", "tags", "title", "updatedAt", "videoUrl", "youtubeUrl") SELECT "authorId", "content", "coverImageUrl", "createdAt", "excerpt", "id", "published", "publishedAt", "slug", "tags", "title", "updatedAt", "videoUrl", "youtubeUrl" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");
CREATE INDEX "Post_published_publishedAt_idx" ON "Post"("published", "publishedAt");
CREATE TABLE "new_PublishTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platform" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalUrl" TEXT,
    "error" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "postId" TEXT NOT NULL,
    CONSTRAINT "PublishTarget_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PublishTarget" ("createdAt", "error", "externalUrl", "id", "platform", "postId", "publishedAt", "status", "updatedAt") SELECT "createdAt", "error", "externalUrl", "id", "platform", "postId", "publishedAt", "status", "updatedAt" FROM "PublishTarget";
DROP TABLE "PublishTarget";
ALTER TABLE "new_PublishTarget" RENAME TO "PublishTarget";
CREATE INDEX "PublishTarget_postId_idx" ON "PublishTarget"("postId");
CREATE UNIQUE INDEX "PublishTarget_postId_platform_key" ON "PublishTarget"("postId", "platform");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

