import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ValidationError } from "./errors";

/**
 * Local filesystem storage for uploaded media.
 *
 * Files are written under `public/uploads/` and served by Next's static
 * handler at `/uploads/<name>`. This is a development / demo store: on a
 * serverless or container platform the filesystem is ephemeral, so production
 * should swap this module for object storage (S3 / R2 / Vercel Blob). Keeping
 * the surface small — `saveUpload()` — makes that a one-file change.
 */

export type UploadKind = "image" | "video";

const RULES: Record<
  UploadKind,
  { maxBytes: number; types: Record<string, string> }
> = {
  image: {
    maxBytes: 8 * 1024 * 1024,
    types: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    },
  },
  video: {
    maxBytes: 200 * 1024 * 1024,
    types: {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
    },
  },
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveUpload(
  file: File,
  kind: UploadKind,
): Promise<{ url: string; type: string }> {
  const rule = RULES[kind];

  const ext = rule.types[file.type];
  if (!ext) {
    throw new ValidationError(
      undefined,
      `Unsupported ${kind} type: ${file.type || "unknown"}`,
    );
  }
  if (file.size === 0) {
    throw new ValidationError(undefined, "The file is empty");
  }
  if (file.size > rule.maxBytes) {
    const mb = Math.round(rule.maxBytes / 1024 / 1024);
    throw new ValidationError(undefined, `${kind} must be ${mb} MB or smaller`);
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, name), bytes);

  return { url: `/uploads/${name}`, type: file.type };
}
