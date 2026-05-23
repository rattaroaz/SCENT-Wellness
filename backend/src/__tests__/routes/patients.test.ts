import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import { createTestUser, getAuthHeader, createTestPatient } from "../../test/helpers";
import { Role } from "@prisma/client";

describe("Patient routes", () => {
  let app: FastifyInstance;
  let token: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const user = await createTestUser(Role.USER);
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: user.username, password: "password" },
    });
    token = JSON.parse(login.body).token;

    const guest = await createTestUser(Role.GUEST);
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

  it("requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/patients" });
    expect(res.statusCode).toBe(401);
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

  it("POST /patients rejects invalid payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      headers: getAuthHeader(token),
      payload: { lastName: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /patients upserts on duplicate MRN", async () => {
    const mrn = `MRN-DUP-${Date.now()}`;
    const first = await app.inject({
      method: "POST",
      url: "/patients",
      headers: getAuthHeader(token),
      payload: {
        lastName: "Old",
        firstName: "Name",
        dateOfBirth: "1990-01-01",
        mrn,
        cellPhone: "5550000001",
      },
    });
    const firstId = JSON.parse(first.body).patient.id;

    const second = await app.inject({
      method: "POST",
      url: "/patients",
      headers: getAuthHeader(token),
      payload: {
        lastName: "New",
        firstName: "Name",
        dateOfBirth: "1990-01-01",
        mrn,
        cellPhone: "5550000002",
      },
    });
    const body = JSON.parse(second.body);
    expect(body.patient.id).toBe(firstId);
    expect(body.patient.lastName).toBe("New");
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

  it("GET /patients/:id returns 404 when not found", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/patients/does-not-exist",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /patients/:id returns the patient when found", async () => {
    const p = await createTestPatient();
    const res = await app.inject({
      method: "GET",
      url: `/patients/${p.id}`,
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).patient.id).toBe(p.id);
  });

  it("DELETE /patients/:id forbidden for guest", async () => {
    const p = await createTestPatient();
    const res = await app.inject({
      method: "DELETE",
      url: `/patients/${p.id}`,
      headers: getAuthHeader(guestToken),
    });
    expect(res.statusCode).toBe(403);
  });

  it("DELETE /patients/:id returns 404 when missing", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/patients/does-not-exist",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });
});
