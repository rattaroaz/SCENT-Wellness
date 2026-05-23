import { describe, it, expect, afterEach } from "vitest";
import pino from "pino";
import { getLogger, setRootLogger } from "../../lib/logger";

describe("logger", () => {
  let previous: ReturnType<typeof getLogger>;

  afterEach(() => {
    if (previous) setRootLogger(previous);
  });

  it("getLogger returns child loggers with module name", () => {
    previous = getLogger();
    const silent = pino({ level: "silent" });
    setRootLogger(silent);
    const child = getLogger("test-module");
    expect(child.bindings()).toMatchObject({ module: "test-module" });
  });

  it("redacts sensitive fields in log output", () => {
    const chunks: string[] = [];
    const stream = {
      write(msg: string) {
        chunks.push(msg);
      },
    };
    const testLogger = pino(
      {
        level: "info",
        redact: {
          paths: ["password", "token"],
          censor: "[REDACTED]",
        },
      },
      stream
    );
    testLogger.info({ password: "secret123", token: "jwt-here", userId: "u1" }, "test");
    const output = chunks.join("");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret123");
    expect(output).not.toContain("jwt-here");
    expect(output).toContain("u1");
  });
});
