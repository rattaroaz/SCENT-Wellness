import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import {
  createTestUser,
  getAuthHeader,
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { DEFAULT_NO_REPLY_MESSAGE } from "../../lib/smsDefaults";

describe("SMS no-reply auto-response", () => {
  let app: FastifyInstance;
  let token: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    /* per-test data created inline */
  });

  it("sends template auto-reply instead of forwarding to physician", async () => {
    const patient = await createTestPatient();
    const template = await prisma.procedureTemplate.create({
      data: {
        name: `NoReply-${Date.now()}`,
        noReplyMessage: "Please call the clinic at 555-0000.",
        messages: {
          create: {
            sortOrder: 0,
            body: "Info only",
            expectsResponse: false,
          },
        },
      },
      include: { messages: true },
    });

    const campaignRes = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });
    const campaignId = JSON.parse(campaignRes.body).campaign.id;

    const outbound = await prisma.simulatedSmsLog.create({
      data: {
        direction: "OUTBOUND",
        fromNumber: "SCENT-App",
        toNumber: patient.cellPhone,
        body: "Info only",
        patientId: patient.id,
        campaignId,
        expectsResponse: false,
        questionMessage: "Info only",
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Thanks" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.forwarded).toBe(false);
    expect(body.autoReply.body).toBe("Please call the clinic at 555-0000.");
    expect(body.inbound.body).toBe("Thanks");

    const physicianCount = await prisma.physicianForwardEntry.count({
      where: { mrn: patient.mrn },
    });
    expect(physicianCount).toBe(0);
  });

  it("PATCH /scheduled-messages/:id toggles expectsResponse", async () => {
    const patient = await createTestPatient();
    const template = await createTestTemplate([
      { body: "Question?", seconds: 1, expectsResponse: true },
    ]);
    const start = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });
    const scheduledId = JSON.parse(start.body).campaign.scheduled[0].id;

    const patch = await app.inject({
      method: "PATCH",
      url: `/scheduled-messages/${scheduledId}`,
      headers: getAuthHeader(token),
      payload: { expectsResponse: false },
    });
    expect(patch.statusCode).toBe(200);
    expect(JSON.parse(patch.body).scheduled.expectsResponse).toBe(false);
  });

  it("uses default no-reply text when template message is empty", async () => {
    const patient = await createTestPatient();
    const template = await createTestTemplate([{ body: "FYI", expectsResponse: false }]);
    const campaignRes = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });
    const campaignId = JSON.parse(campaignRes.body).campaign.id;

    const outbound = await prisma.simulatedSmsLog.create({
      data: {
        direction: "OUTBOUND",
        fromNumber: "SCENT-App",
        toNumber: patient.cellPhone,
        body: "FYI",
        patientId: patient.id,
        campaignId,
        expectsResponse: false,
      },
    });

    const res = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Hello?" },
    });
    expect(JSON.parse(res.body).autoReply.body).toBe(DEFAULT_NO_REPLY_MESSAGE);
  });
});
