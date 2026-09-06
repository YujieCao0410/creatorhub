import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "./env";

/**
 * Symmetric encryption for secrets we have to store and read back — currently
 * the OAuth access/refresh tokens in the `Integration` table. AES-256-GCM with
 * a key from `TOKEN_ENCRYPTION_KEY` (32 bytes as 64 hex chars, or base64).
 *
 * Rollout is zero-downtime: {@link decryptSecret} passes plaintext straight
 * through, so rows written before the key existed keep working and get
 * encrypted the next time they're saved (a token refresh or a reconnect).
 */

const PREFIX = "v1:";

function key(): Buffer | null {
  const raw = env.TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)",
    );
  }
  return buf;
}

let warned = false;

/** Encrypts a secret for at-rest storage. Returns plaintext unchanged if no key is set. */
export function encryptSecret(plain: string): string {
  const k = key();
  if (!k) {
    if (!warned && process.env.NODE_ENV === "production") {
      console.warn(
        "[crypto] TOKEN_ENCRYPTION_KEY not set — OAuth tokens are being stored in plaintext",
      );
      warned = true;
    }
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ct].map((b) => b.toString("base64")).join(":");
}

/** Decrypts a value from {@link encryptSecret}; legacy plaintext passes through. */
export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const k = key();
  if (!k) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set but an encrypted value was found",
    );
  }
  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    k,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
