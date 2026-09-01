import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/**
 * Runs once before the whole test suite: rebuilds a throwaway SQLite database
 * from the migrations so every run starts from a known, up-to-date schema.
 *
 * The `file:` URL is resolved relative to prisma/schema.prisma, so this is
 * prisma/test.db.
 */
const TEST_DB_URL = "file:./test.db";

export default function setup() {
  rmSync("prisma/test.db", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
  });
}
