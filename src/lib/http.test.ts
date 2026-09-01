import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
} from "./errors";
import { handleApiError } from "./http";

describe("handleApiError", () => {
  it("maps AppError subclasses to their status and code", async () => {
    const res = handleApiError(new NotFoundError("Post"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "NOT_FOUND", message: "Post not found" },
    });
  });

  it("maps AuthorizationError to 403", () => {
    expect(handleApiError(new AuthorizationError()).status).toBe(403);
  });

  it("maps ConflictError to 409", () => {
    expect(handleApiError(new ConflictError("Email in use")).status).toBe(409);
  });

  it("maps ZodError to 422 with field details", async () => {
    const parsed = z.object({ email: z.email() }).safeParse({
      email: "not-an-email",
    });
    expect(parsed.success).toBe(false);
    const res = handleApiError(parsed.error);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it("hides unknown errors behind a generic 500", async () => {
    const res = handleApiError(new Error("database on fire"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toBe("Something went wrong");
    expect(JSON.stringify(body)).not.toContain("fire");
  });
});
