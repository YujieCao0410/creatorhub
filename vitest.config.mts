import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Loads DATABASE_URL/JWT_SECRET etc. for integration tests.
    env: {
      NODE_ENV: "test",
    },
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
