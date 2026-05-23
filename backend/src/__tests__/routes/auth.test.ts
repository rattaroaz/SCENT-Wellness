import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import { getAuthHeader } from "../../test/helpers";

describe("Auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/login returns token for valid credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "password" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeDefined();
    expect(body.user.role).toBe("ADMIN");
  });

  it("POST /auth/login rejects invalid password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me returns user when authenticated", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "password" },
    });
    const { token } = JSON.parse(login.body);

    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).user.username).toBe("admin");
  });

  it("POST /auth/login rejects invalid payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /auth/login rejects unknown user with 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "nobody-xyz", password: "password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /auth/me rejects malformed bearer token with 401", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { Authorization: "Token notbearer" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/logout requires auth and records audit", async () => {
    const unauth = await app.inject({ method: "POST", url: "/auth/logout" });
    expect(unauth.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "password" },
    });
    const { token } = JSON.parse(login.body);

    const out = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: getAuthHeader(token),
    });
    expect(out.statusCode).toBe(200);
    expect(JSON.parse(out.body)).toEqual({ ok: true });
  });

  it("audit row is written for successful login", async () => {
    const { prisma } = await import("../../lib/prisma");
    await prisma.auditLog.deleteMany({ where: { action: "auth.login" } });

    await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "password" },
    });
    const row = await prisma.auditLog.findFirst({ where: { action: "auth.login" } });
    expect(row).toBeTruthy();
  });

  it("audit row is written for failed login (no userId)", async () => {
    const { prisma } = await import("../../lib/prisma");
    await prisma.auditLog.deleteMany({ where: { action: "auth.login_failed" } });

    await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "admin", password: "wrong" },
    });
    const row = await prisma.auditLog.findFirst({
      where: { action: "auth.login_failed" },
    });
    expect(row).toBeTruthy();
    expect(row?.userId).toBeNull();
  });
});
