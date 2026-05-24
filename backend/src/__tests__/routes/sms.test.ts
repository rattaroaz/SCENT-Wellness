import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import {
  createTestUser,
  getAuthHeader,
  createTestPatient,
  createTestTemplate,
  createOutboundSmsLog,
} from "../../test/helpers";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";

describe("SMS routes", () => {
  let app: FastifyInstance;
  let token: string;
  let adminToken: string;
  let patientId: string;
  let campaignId: string;

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

    const admin = await createTestUser(Role.ADMIN);
    const adminLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: admin.username, password: "password" },
    });
    adminToken = JSON.parse(adminLogin.body).token;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const patient = await createTestPatient({ cellPhone: "555-111-2222" });
    patientId = patient.id;

    const template = await createTestTemplate([
      { body: "How are you feeling?", seconds: 5 },
    ]);
    const campaignRes = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: {
        patientId,
        templateId: template.id,
        physicianPhone: "5555555550",
      },
    });
    campaignId = JSON.parse(campaignRes.body).campaign.id;
  });

  it("POST /sms/simulate/reply returns 404 for unknown outbound log", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: "nonexistent", answer: "I feel great" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /sms/simulate/reply forwards to campaign physicianPhone", async () => {
    const outbound = await createOutboundSmsLog({
      patientId,
      campaignId,
      body: "Rate your pain 1-10",
      questionMessage: "Rate your pain 1-10",
    });

    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Pain is 3" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.inbound).toBeDefined();
    expect(body.forward).toBeDefined();
    expect(body.forward.physicianPhone).toBe("5555555550");
    expect(body.forward.patientAnswer).toBe("Pain is 3");
    expect(body.inbound.body).toBe("Pain is 3");
    expect(body.inbound.body).not.toContain("Q:");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "sms.reply", resourceId: outbound.id },
    });
    expect(audit).toBeTruthy();
  });

  it("GET /sms/patient-inbox returns logs for patient", async () => {
    await createOutboundSmsLog({ patientId, campaignId });

    const res = await app.inject({
      method: "GET",
      url: `/sms/patient-inbox?patientId=${patientId}`,
      headers: getAuthHeader(token),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.logs.length).toBeGreaterThan(0);
  });

  it("requires authentication", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/sms/patient-inbox",
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /sms/simulate/reply rejects invalid payload", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /sms/simulate/reply rejects non-outbound targets", async () => {
    const inbound = await prisma.simulatedSmsLog.create({
      data: {
        direction: "INBOUND",
        fromNumber: "555-111-2222",
        toNumber: "5555555550",
        body: "Patient started this",
        patientId,
        campaignId,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: inbound.id, answer: "Nope" },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe("Can only reply to clinic messages");
  });

  it("GET /sms/physician-inbox supports phone filter", async () => {
    await createOutboundSmsLog({ patientId, campaignId });
    const replyRes = await app.inject({
      method: "POST",
      url: `/sms/simulate/reply`,
      headers: getAuthHeader(token),
      payload: {
        outboundLogId: (
          await prisma.simulatedSmsLog.findFirstOrThrow({
            where: { patientId, direction: "OUTBOUND" },
            orderBy: { createdAt: "desc" },
          })
        ).id,
        answer: "Reply for phone filter test",
      },
    });
    expect(replyRes.statusCode).toBe(200);

    const matching = await app.inject({
      method: "GET",
      url: "/sms/physician-inbox?phone=5555555550",
      headers: getAuthHeader(token),
    });
    expect(matching.statusCode).toBe(200);
    expect(JSON.parse(matching.body).entries.length).toBeGreaterThan(0);

    const nonmatching = await app.inject({
      method: "GET",
      url: "/sms/physician-inbox?phone=5559999999",
      headers: getAuthHeader(token),
    });
    expect(JSON.parse(nonmatching.body).entries.length).toBe(0);
  });

  it("GET /sms/physician-config returns array", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/sms/physician-config",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body).configs)).toBe(true);
  });

  it("PUT /sms/physician-config/:id validates admin payloads", async () => {
    const suffix = Date.now().toString().slice(-7);
    const cfg = await prisma.physicianForward.create({
      data: { physicianPhone: `555${suffix}`, enabled: true, label: "Before" },
    });

    const invalid = await app.inject({
      method: "PUT",
      url: `/sms/physician-config/${cfg.id}`,
      headers: getAuthHeader(adminToken),
      payload: { physicianPhone: "" },
    });
    expect(invalid.statusCode).toBe(400);

    const valid = await app.inject({
      method: "PUT",
      url: `/sms/physician-config/${cfg.id}`,
      headers: getAuthHeader(adminToken),
      payload: {
        physicianPhone: `(555) ${suffix.slice(0, 3)}-${suffix.slice(3)}`,
        enabled: false,
        label: "After",
      },
    });

    expect(valid.statusCode).toBe(200);
    const body = JSON.parse(valid.body);
    expect(body.config.physicianPhone).toBe(`555${suffix}`);
    expect(body.config.enabled).toBe(false);
    expect(body.config.label).toBe("After");
  });

  it("POST /sms/simulate/clear accepts empty JSON body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/clear",
      headers: getAuthHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);
  });

  it("POST /sms/simulate/clear removes patient simulator logs and physician forwards", async () => {
    const outbound = await createOutboundSmsLog({ patientId, campaignId });
    await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Clear me" },
    });

    const clear = await app.inject({
      method: "POST",
      url: `/sms/simulate/clear?patientId=${patientId}`,
      headers: getAuthHeader(token),
    });
    expect(clear.statusCode).toBe(200);
    const clearBody = JSON.parse(clear.body);
    expect(clearBody.logs).toBeGreaterThanOrEqual(2);
    expect(clearBody.forwards).toBeGreaterThanOrEqual(1);

    const inbox = await app.inject({
      method: "GET",
      url: `/sms/patient-inbox?patientId=${patientId}`,
      headers: getAuthHeader(token),
    });
    expect(JSON.parse(inbox.body).logs).toHaveLength(0);

    const phys = await app.inject({
      method: "GET",
      url: "/sms/physician-inbox?phone=5555555550",
      headers: getAuthHeader(token),
    });
    expect(
      JSON.parse(phys.body).entries.some(
        (e: { patientAnswer: string }) => e.patientAnswer === "Clear me"
      )
    ).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "sms.simulator.clear", resourceId: patientId },
    });
    expect(audit).toBeTruthy();
  });

  it("PUT /sms/physician-config/:id rejects non-admin", async () => {
    const phone = `555${Date.now().toString().slice(-7)}`;
    const cfg = await prisma.physicianForward.create({
      data: { physicianPhone: phone, enabled: true, label: "Test" },
    });
    const res = await app.inject({
      method: "PUT",
      url: `/sms/physician-config/${cfg.id}`,
      headers: getAuthHeader(token),
      payload: { physicianPhone: "5557778888" },
    });
    expect(res.statusCode).toBe(403);
  });
});
