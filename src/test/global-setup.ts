import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./db-url";

/**
 * Runs once before the whole test suite: applies the migrations to the
 * dedicated Postgres test database so the schema is up to date. Per-test
 * cleanup is `resetDb()` (see src/test/helpers.ts), so no destructive reset
 * is needed here.
 */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
