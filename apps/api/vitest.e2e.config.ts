import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/e2e/**/*.e2e.test.ts"],
    setupFiles: ["./test/e2e/setup-env.ts"],
    globalSetup: ["./test/e2e/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});