import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./jwt";

describe("session tokens", () => {
  it("round-trips a user id", async () => {
    const token = await signSessionToken("user_123");
    expect(await verifySessionToken(token)).toBe("user_123");
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken("user_123");
    expect(await verifySessionToken(`${token}x`)).toBeNull();
  });

  it("rejects a non-JWT string", async () => {
    expect(await verifySessionToken("not.a.jwt")).toBeNull();
  });
});
