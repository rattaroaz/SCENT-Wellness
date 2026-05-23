import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import { createTestUser, getAuthHeader, createTestTemplate } from "../../test/helpers";
import { Role } from "@prisma/client";

describe("Template routes", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const admin = await createTestUser(Role.ADMIN);
    const guest = await createTestUser(Role.GUEST);

    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: admin.username, password: "password" },
    });
    adminToken = JSON.parse(adminLogin.body).token;

    const guestLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: guest.username, password: "password" },
    });
    guestToken = JSON.parse(guestLogin.body).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /templates lists templates", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/templates",
      headers: getAuthHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body).templates)).toBe(true);
  });

  it("POST /templates creates template for admin", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/templates",
      headers: getAuthHeader(adminToken),
      payload: {
        name: `New-Template-${Date.now()}`,
        messages: [{ body: "Hello", seconds: 10 }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).template.messages.length).toBe(1);
  });

  it("POST /templates rejects guest", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/templates",
      headers: getAuthHeader(guestToken),
      payload: {
        name: `Guest-Template-${Date.now()}`,
        messages: [{ body: "Nope" }],
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("PUT /templates/:id updates template", async () => {
    const template = await createTestTemplate([{ body: "Original" }]);
    const res = await app.inject({
      method: "PUT",
      url: `/templates/${template.id}`,
      headers: getAuthHeader(adminToken),
      payload: {
        name: template.name,
        messages: [{ body: "Updated", seconds: 5 }],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).template.messages[0].body).toBe("Updated");
  });

  it("POST /templates rejects duplicate name with 409", async () => {
    const name = `Dup-${Date.now()}`;
    const first = await app.inject({
      method: "POST",
      url: "/templates",
      headers: getAuthHeader(adminToken),
      payload: { name, messages: [{ body: "A" }] },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/templates",
      headers: getAuthHeader(adminToken),
      payload: { name, messages: [{ body: "B" }] },
    });
    expect(second.statusCode).toBe(409);
  });

  it("GET /templates/:id returns 404 for missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/templates/missing",
      headers: getAuthHeader(adminToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it("PUT /templates/:id rejects guest with 403", async () => {
    const template = await createTestTemplate([{ body: "Orig" }]);
    const res = await app.inject({
      method: "PUT",
      url: `/templates/${template.id}`,
      headers: getAuthHeader(guestToken),
      payload: { name: template.name, messages: [{ body: "X" }] },
    });
    expect(res.statusCode).toBe(403);
  });

  it("PUT /templates/:id rejects duplicate name conflict", async () => {
    const a = await createTestTemplate([{ body: "A" }]);
    const b = await createTestTemplate([{ body: "B" }]);
    const res = await app.inject({
      method: "PUT",
      url: `/templates/${b.id}`,
      headers: getAuthHeader(adminToken),
      payload: { name: a.name, messages: [{ body: "X" }] },
    });
    expect(res.statusCode).toBe(409);
  });

  it("DELETE /templates/:id removes template", async () => {
    const template = await createTestTemplate([{ body: "Doomed" }]);
    const res = await app.inject({
      method: "DELETE",
      url: `/templates/${template.id}`,
      headers: getAuthHeader(adminToken),
    });
    expect(res.statusCode).toBe(200);
  });

  it("DELETE /templates/:id rejects guest with 403", async () => {
    const template = await createTestTemplate([{ body: "Safe" }]);
    const res = await app.inject({
      method: "DELETE",
      url: `/templates/${template.id}`,
      headers: getAuthHeader(guestToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /templates rejects invalid payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/templates",
      headers: getAuthHeader(adminToken),
      payload: { name: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});
