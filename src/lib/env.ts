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
  /** Default Pro price (CAD). */
  STRIPE_PRICE_PRO: z.string().optional(),
  /** Pro price in CNY, used for Chinese-locale checkout. Falls back to the default. */
  STRIPE_PRICE_PRO_CNY: z.string().optional(),

  /** Google OAuth, for publishing videos to YouTube. Optional. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** TikTok for Developers app, for publishing to TikTok. Optional. */
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),

  /** Meta app with "Instagram API with Instagram Login". Optional. */
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),

  /** Threads API — same Meta app as Instagram, "Access Threads API" product. */
  THREADS_APP_ID: z.string().optional(),
  THREADS_APP_SECRET: z.string().optional(),

  /** Facebook Page publishing — same Meta app, classic Facebook Login. */
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  /** Anthropic API, for AI caption + hashtag generation. Optional. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),

  /**
   * Vercel Blob token. When set, uploads go to Blob object storage (required
   * on serverless — the filesystem is ephemeral). Unset → local `public/uploads`.
   */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  /** Set to "1" to disable API rate limiting (e2e tests only). */
  RATE_LIMIT_DISABLED: z.enum(["0", "1"]).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
