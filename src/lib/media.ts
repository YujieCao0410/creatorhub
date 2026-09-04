import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

/**
 * Resolving stored media references. A reference is either a local path
 * (`/uploads/<name>`, served from `public/`) or an absolute URL from object
 * storage (Vercel Blob). These helpers hide that difference from callers.
 */

const REMOTE = /^https?:\/\//;

/** True when the reference is media CreatorHub itself hosts (local disk or our Blob store). */
export function isOwnMedia(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return ref.startsWith("/uploads/") || ref.includes(".blob.vercel-storage.com/");
}

/** A publicly fetchable absolute URL for a stored reference. */
export function publicMediaUrl(ref: string): string {
  return REMOTE.test(ref) ? ref : `${env.APP_URL}${ref}`;
}

/** The bytes behind a stored reference, whether it lives on disk or in object storage. */
export async function readMediaBytes(ref: string): Promise<Buffer> {
  if (REMOTE.test(ref)) {
    const res = await fetch(ref);
    if (!res.ok) {
      throw new Error(`Could not fetch media (${res.status}): ${ref}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(path.join(process.cwd(), "public", ref));
}
