import { execSync } from "node:child_process";

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://creatorhub:creatorhub@localhost:5432/creatorhub_e2e?schema=public";

/**
 * Ensures the e2e Postgres schema exists and resets its data before the suite.
 */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: E2E_DATABASE_URL };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx e2e/reset-db.ts", { stdio: "inherit", env });
}
