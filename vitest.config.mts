import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// SQLite file: URLs are resolved relative to prisma/schema.prisma, so this
// points at prisma/test.db.
const TEST_DATABASE_URL = "file:./test.db";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-secret-that-is-at-least-thirty-two-chars",
    },
    globalSetup: ["./src/test/global-setup.ts"],
    // Test files share one SQLite database and reset it between tests, so they
    // must not run in parallel.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
