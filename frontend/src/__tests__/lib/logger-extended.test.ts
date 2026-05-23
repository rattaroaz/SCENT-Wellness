import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clientLogger,
  setClientLogContext,
  clearClientLogField,
  _resetClientLogContextForTests,
} from "@/lib/logger";

describe("clientLogger – context & filtering", () => {
  beforeEach(() => {
    _resetClientLogContextForTests();
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

  it("global context is merged into every log entry", () => {
    setClientLogContext({ userId: "u123" });
    clientLogger.info("hello");
    const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toMatchObject({ userId: "u123", msg: "hello", level: "info" });
  });

  it("clearClientLogField removes a single field", () => {
    setClientLogContext({ userId: "u123", role: "ADMIN" });
    clearClientLogField("userId");
    clientLogger.info("logout");
    const call = (console.info as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).not.toHaveProperty("userId");
    expect(call[1]).toMatchObject({ role: "ADMIN" });
  });

  it("emits at warn and error levels", () => {
    clientLogger.warn("careful");
    clientLogger.error("bad");
    expect(console.warn).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("respects NEXT_PUBLIC_LOG_LEVEL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_LOG_LEVEL", "warn");
    clientLogger.info("filtered");
    clientLogger.warn("kept");
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("debug logs are filtered in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    clientLogger.debug("noise");
    expect(console.debug).not.toHaveBeenCalled();
  });

  it("test environment silences all output", () => {
    vi.stubEnv("NODE_ENV", "test");
    clientLogger.info("nope");
    expect(console.info).not.toHaveBeenCalled();
  });
});
