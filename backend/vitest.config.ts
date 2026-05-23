import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NODE_ENV: "test",
      VITEST: "true",
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-jwt-secret",
      LOG_LEVEL: "silent",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.d.ts",
        "**/test/**",
        "**/prisma/**",
        "src/index.ts",
      ],
      thresholds: {
        lines: 75,
        functions: 70,
        branches: 70,
        statements: 75,
      },
    },
    testTimeout: 15000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
