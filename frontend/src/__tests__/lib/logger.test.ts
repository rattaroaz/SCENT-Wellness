import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clientLogger } from "@/lib/logger";

describe("clientLogger", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs info in development", () => {
    clientLogger.info("hello", { userId: "1" });
    expect(console.info).toHaveBeenCalled();
  });

  it("does not log in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    clientLogger.info("silent");
    expect(console.info).not.toHaveBeenCalled();
  });
});
