import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../index";
import {
  createTestPatient,
  createTestTemplate,
  createTestUser,
  getAuthHeader,
} from "../../test/helpers";
import { Role } from "@prisma/client";
import {
  authMeResponseSchema,
  campaignStartResponseSchema,
  errorResponseSchema,
  healthResponseSchema,
  loginResponseSchema,
  parseContract,
  patientCreateResponseSchema,
  patientInboxResponseSchema,
  patientsListResponseSchema,
  physicianInboxResponseSchema,
  simulateClearResponseSchema,
  templatesListResponseSchema,
} from "../../contracts/api-schemas";

describe("API contract tests", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const user = await createTestUser(Role.ADMIN);
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: user.username, password: "password" },
    });
    token = parseContract(
      loginResponseSchema,
      JSON.parse(login.body),
      "POST /auth/login"
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health matches contract", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    parseContract(healthResponseSchema, JSON.parse(res.body), "GET /health");
  });

  it("POST /auth/login success matches contract", async () => {
    const user = await createTestUser(Role.USER);
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: user.username, password: "password" },
    });
    expect(res.statusCode).toBe(200);
    parseContract(loginResponseSchema, JSON.parse(res.body), "POST /auth/login");
  });

  it("POST /auth/login failure matches error contract", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "nobody", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
    parseContract(errorResponseSchema, JSON.parse(res.body), "POST /auth/login 401");
  });

  it("GET /auth/me matches contract", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    parseContract(authMeResponseSchema, JSON.parse(res.body), "GET /auth/me");
  });

  it("GET /patients matches contract", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/patients",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    parseContract(patientsListResponseSchema, JSON.parse(res.body), "GET /patients");
  });

  it("POST /patients matches contract", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/patients",
      headers: getAuthHeader(token),
      payload: {
        lastName: "Contract",
        firstName: "Test",
        dateOfBirth: "1990-05-01",
        mrn: `MRN-C-${Date.now()}`,
        cellPhone: "5555550199",
      },
    });
    expect(res.statusCode).toBe(200);
    parseContract(
      patientCreateResponseSchema,
      JSON.parse(res.body),
      "POST /patients"
    );
  });

  it("GET /templates matches contract", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/templates",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    parseContract(templatesListResponseSchema, JSON.parse(res.body), "GET /templates");
  });

  it("POST /campaigns matches contract", async () => {
    const patient = await createTestPatient({ cellPhone: "555-555-0101" });
    const template = await createTestTemplate([
      { body: "Contract check-in", seconds: 60 },
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: {
        patientId: patient.id,
        templateId: template.id,
        physicianPhone: "5555555551",
      },
    });
    expect(res.statusCode).toBe(200);
    parseContract(
      campaignStartResponseSchema,
      JSON.parse(res.body),
      "POST /campaigns"
    );
  });

  it("GET /sms/patient-inbox matches contract", async () => {
    const patient = await createTestPatient({ cellPhone: "555-555-0102" });
    const res = await app.inject({
      method: "GET",
      url: `/sms/patient-inbox?patientId=${patient.id}`,
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    parseContract(
      patientInboxResponseSchema,
      JSON.parse(res.body),
      "GET /sms/patient-inbox"
    );
  });

  it("GET /sms/physician-inbox matches contract", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/sms/physician-inbox?phone=5555555551",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    parseContract(
      physicianInboxResponseSchema,
      JSON.parse(res.body),
      "GET /sms/physician-inbox"
    );
  });

  it("POST /sms/simulate/clear matches contract", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/clear",
      headers: getAuthHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    parseContract(
      simulateClearResponseSchema,
      JSON.parse(res.body),
      "POST /sms/simulate/clear"
    );
  });
});
