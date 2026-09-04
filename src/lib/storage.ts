import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { env } from "./env";
import { ValidationError } from "./errors";

/**
 * Storage for uploaded media.
 *
 * With `BLOB_READ_WRITE_TOKEN` set, files go to Vercel Blob object storage and
 * `saveUpload()` returns an absolute `https://…` URL. Without it (local dev),
 * files are written under `public/uploads/` and served by Next at
 * `/uploads/<name>`. `src/lib/media.ts` resolves both forms.
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

  const name = `${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, bytes, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, type: file.type };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), bytes);
  return { url: `/uploads/${name}`, type: file.type };
}
