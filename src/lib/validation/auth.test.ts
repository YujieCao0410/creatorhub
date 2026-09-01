import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth";

describe("registerSchema", () => {
  it("normalizes email and handle (trim + lowercase)", () => {
    const out = registerSchema.parse({
      email: "  Alice@Example.COM ",
      handle: " Alice ",
      name: "  Alice Rivera  ",
      password: "supersecret",
    });
    expect(out).toEqual({
      email: "alice@example.com",
      handle: "alice",
      name: "Alice Rivera",
      password: "supersecret",
    });
  });

  it.each([
    ["spaces in handle", { handle: "a b" }],
    ["symbols in handle", { handle: "a-b!" }],
    ["handle too short", { handle: "ab" }],
    ["invalid email", { email: "nope" }],
    ["password too short", { password: "short" }],
    ["empty name", { name: "   " }],
  ])("rejects %s", (_label, override) => {
    const base = {
      email: "user@example.com",
      handle: "validhandle",
      name: "Valid Name",
      password: "supersecret",
    };
    expect(registerSchema.safeParse({ ...base, ...override }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "u@e.com", password: "" }).success,
    ).toBe(false);
  });
});
