import { z } from "zod";

/**
 * Validates environment variables once, at module load.
 * Importing `env` anywhere guarantees the process has a well-formed config,
 * and gives us a typed object instead of `string | undefined` everywhere.
 *
 * Stripe variables are optional: the app runs fully without them, with billing
 * endpoints returning 503 and the upgrade UI hidden (see `src/lib/stripe.ts`).
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** Public origin, used to build Stripe redirect URLs. */
  APP_URL: z.url().default("http://localhost:3000"),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
