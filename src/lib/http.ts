import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ValidationError } from "./errors";

/**
 * Shared HTTP helpers for route handlers.
 *
 * Every successful response goes through `ok` / `created` / `noContent`, and
 * every error through `handleApiError`, so the API speaks one consistent
 * JSON dialect:
 *   success -> the resource, or `{ data: ... }` for collections
 *   error   -> { error: { code, message, details? } }
 */

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

export function handleApiError(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  // Unknown: log server-side, never leak internals to the client.
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" } },
    { status: 500 },
  );
}

/**
 * Reads and parses a JSON request body, rejecting oversized payloads before
 * they are buffered. Returns `null` for absent or malformed JSON so callers can
 * hand it straight to `schema.parse()`.
 */
export async function readJsonBody(
  req: Request,
  maxBytes = 100_000,
): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ValidationError(undefined, "Request body is too large");
  }
  return req.json().catch(() => null);
}

/** Next.js signals redirect()/notFound() by throwing an error with this digest. */
function isNextControlFlow(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest === "NEXT_NOT_FOUND" ||
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT"))
  );
}

/**
 * Wraps a route handler so any thrown error becomes a proper JSON response.
 * `Ctx` is the Next.js route context (e.g. `{ params: Promise<{ id: string }> }`).
 */
export function withErrorHandling<Ctx>(
  handler: (req: Request, ctx: Ctx) => Response | Promise<Response>,
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      // Let redirect()/notFound() propagate to Next's own handling.
      if (isNextControlFlow(error)) throw error;
      return handleApiError(error);
    }
  };
}
