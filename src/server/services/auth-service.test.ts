import { beforeEach, describe, expect, it } from "vitest";
import { AuthenticationError, ConflictError } from "@/lib/errors";
import { resetDb } from "@/test/helpers";
import { authenticateUser, registerUser } from "./auth-service";

const validInput = {
  email: "test@example.com",
  handle: "tester",
  name: "Test User",
  password: "supersecret",
};

beforeEach(async () => {
  await resetDb();
});

describe("registerUser", () => {
  it("creates a user and returns no secret fields", async () => {
    const user = await registerUser(validInput);
    expect(user.handle).toBe("tester");
    expect(user.email).toBe("test@example.com");
    // No passwordHash, and nothing that looks like a bcrypt hash.
    expect(JSON.stringify(user)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("rejects a duplicate email", async () => {
    await registerUser(validInput);
    await expect(
      registerUser({ ...validInput, handle: "different" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a duplicate handle", async () => {
    await registerUser(validInput);
    await expect(
      registerUser({ ...validInput, email: "different@example.com" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("authenticateUser", () => {
  it("returns the user for correct credentials", async () => {
    await registerUser(validInput);
    const user = await authenticateUser({
      email: validInput.email,
      password: validInput.password,
    });
    expect(user.handle).toBe("tester");
  });

  it("throws for a wrong password", async () => {
    await registerUser(validInput);
    await expect(
      authenticateUser({ email: validInput.email, password: "wrongpass" }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("throws for an unknown email", async () => {
    await expect(
      authenticateUser({ email: "nobody@example.com", password: "whatever" }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});
