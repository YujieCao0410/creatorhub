import { z } from "zod";

/**
 * Request-body schemas for the auth endpoints. Route handlers call
 * `schema.parse(body)`; a failure becomes a 422 via `handleApiError`.
 */

// Normalize (trim + lowercase) before format validation so " A@B.com " is valid.
const emailField = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const registerSchema = z.object({
  email: emailField,
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be at most 30 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Handle may only contain lowercase letters, numbers, and underscores",
    ),
  name: z.string().trim().min(1, "Name is required").max(80),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;
