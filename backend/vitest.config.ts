import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/__tests__/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
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
        lines: 90,
        functions: 90,
        branches: 72,
        statements: 90,
      },
    },
    testTimeout: 15000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
