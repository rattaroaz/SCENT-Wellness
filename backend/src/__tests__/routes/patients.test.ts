import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import { createTestUser, getAuthHeader } from "../../test/helpers";

describe("Patient routes", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const user = await createTestUser();
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: user.username, password: "password" },
    });
    token = JSON.parse(login.body).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /patients creates a patient", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      headers: getAuthHeader(token),
      payload: {
        lastName: "Integration",
        firstName: "Test",
        dateOfBirth: "1985-03-12",
        mrn: `MRN-${Date.now()}`,
        cellPhone: "555-999-0000",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.patient.lastName).toBe("Integration");
  });

  it("GET /patients supports search", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/patients?query=Integration",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.patients)).toBe(true);
  });
});
