import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pino from "pino";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../index";
import { setRootLogger, getLogger } from "../../lib/logger";

type LogEntry = {
  level: string;
  msg: string;
  reqId?: string;
  userId?: string;
  statusCode?: number;
  url?: string;
  durationMs?: number;
};

describe("logging plugin", () => {
  let app: FastifyInstance;
  let entries: LogEntry[];
  let prevLogger: ReturnType<typeof getLogger>;

  beforeAll(async () => {
    entries = [];
    prevLogger = getLogger();
    const captureLogger = pino(
      {
        level: "debug",
        formatters: { level: (label) => ({ level: label }) },
      },
      {
        write(chunk: string) {
          try {
            entries.push(JSON.parse(chunk));
          } catch {
            /* ignore */
          }
        },
      }
    );
    setRootLogger(captureLogger);
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    setRootLogger(prevLogger);
  });

  it("logs request lifecycle with status code and duration", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);

    const completed = entries.find(
      (e) => e.msg === "request completed" && e.url === "/health"
    );
    expect(completed).toBeTruthy();
    expect(completed?.statusCode).toBe(200);
    expect(typeof completed?.durationMs).toBe("number");
    expect(completed?.reqId).toBeTruthy();
  });

  it("logs 4xx responses at warn level", async () => {
    await app.inject({ method: "GET", url: "/auth/me" });
    const warn = entries.find(
      (e) =>
        e.msg === "request completed" &&
        e.url === "/auth/me" &&
        e.statusCode === 401
    );
    expect(warn?.level).toBe("warn");
  });

  it("attaches userId after authentication", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "password" },
    });
    const { token, user } = JSON.parse(login.body);

    entries.length = 0;
    await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { Authorization: `Bearer ${token}` },
    });
    const completed = entries.find(
      (e) => e.msg === "request completed" && e.url === "/auth/me"
    );
    expect(completed?.userId).toBe(user.id);
  });
});
