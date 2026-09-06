import { afterEach, describe, expect, it, vi } from "vitest";

// The module reads env at call time via `env`, so set the key before importing.
const KEY = "a".repeat(64); // 32 bytes of 0x61, valid hex

async function load(key?: string) {
  vi.resetModules();
  vi.doMock("./env", () => ({ env: { TOKEN_ENCRYPTION_KEY: key } }));
  return import("./crypto");
}

afterEach(() => {
  vi.doUnmock("./env");
  vi.unstubAllEnvs();
});

describe("crypto", () => {
  it("round-trips a value", async () => {
    const { encryptSecret, decryptSecret } = await load(KEY);
    const secret = "ya29.a0AfB_by-some-oauth-token";
    const enc = encryptSecret(secret);
    expect(enc).not.toBe(secret);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await load(KEY);
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("passes legacy plaintext through untouched on decrypt", async () => {
    const { decryptSecret } = await load(KEY);
    expect(decryptSecret("plain-legacy-token")).toBe("plain-legacy-token");
  });

  it("no-ops when no key is configured", async () => {
    const { encryptSecret, decryptSecret } = await load(undefined);
    expect(encryptSecret("tok")).toBe("tok");
    expect(decryptSecret("tok")).toBe("tok");
  });

  it("rejects a tampered ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await load(KEY);
    const enc = encryptSecret("secret");
    const parts = enc.slice(3).split(":");
    const ct = Buffer.from(parts[2], "base64");
    ct[0] ^= 0x01;
    parts[2] = ct.toString("base64");
    expect(() => decryptSecret("v1:" + parts.join(":"))).toThrow();
  });

  it("throws on an encrypted value when the key is gone", async () => {
    const { encryptSecret } = await load(KEY);
    const enc = encryptSecret("secret");
    const { decryptSecret } = await load(undefined);
    expect(() => decryptSecret(enc)).toThrow();
  });
});
