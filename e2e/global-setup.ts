import { execSync } from "node:child_process";

/**
 * Ensures the e2e schema exists and resets its data before the suite.
 * Does NOT delete the database file, so a running server keeps its connection.
 */
export default function globalSetup() {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db" };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx tsx e2e/reset-db.ts", { stdio: "inherit", env });
}
