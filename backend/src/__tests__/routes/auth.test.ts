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
});
