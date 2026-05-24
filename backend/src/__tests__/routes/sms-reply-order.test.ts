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
import { Role, SmsDirection } from "@prisma/client";
import { prisma } from "../../lib/prisma";

describe("SMS reply targets specific outbound messages", () => {
  let app: FastifyInstance;
  let token: string;
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const patient = await createTestPatient();
    patientId = patient.id;
    const template = await createTestTemplate([
      { body: "Question one?", seconds: 5 },
      { body: "Question two?", seconds: 10 },
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

  it("links each patient reply to the chosen outbound via replyToLogId", async () => {
    const first = await createOutboundSmsLog({
      patientId,
      campaignId,
      body: "Question one?",
      questionMessage: "Question one?",
    });
    const second = await createOutboundSmsLog({
      patientId,
      campaignId,
      body: "Question two?",
      questionMessage: "Question two?",
    });

    const replySecond = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: second.id, answer: "Answer two first" },
    });
    expect(replySecond.statusCode).toBe(200);
    expect(JSON.parse(replySecond.body).forward.patientAnswer).toBe(
      "Answer two first"
    );

    const replyFirst = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: first.id, answer: "Answer one later" },
    });
    expect(replyFirst.statusCode).toBe(200);

    const mrn = (await prisma.patient.findUniqueOrThrow({ where: { id: patientId } }))
      .mrn;
    const forwards = await prisma.physicianForwardEntry.findMany({
      where: { mrn },
      orderBy: { createdAt: "asc" },
    });
    expect(forwards).toHaveLength(2);
    expect(forwards[0].questionMessage).toBe("Question two?");
    expect(forwards[0].patientAnswer).toBe("Answer two first");
    expect(forwards[1].questionMessage).toBe("Question one?");
    expect(forwards[1].patientAnswer).toBe("Answer one later");

    const inbounds = await prisma.simulatedSmsLog.findMany({
      where: { patientId, direction: SmsDirection.INBOUND },
      orderBy: { createdAt: "asc" },
    });
    expect(inbounds[0].replyToLogId).toBe(second.id);
    expect(inbounds[1].replyToLogId).toBe(first.id);
  });

  it("rejects a second reply to the same outbound", async () => {
    const outbound = await createOutboundSmsLog({
      patientId,
      campaignId,
      body: "Once only",
    });
    const first = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "First" },
    });
    expect(first.statusCode).toBe(200);

    const dup = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Again" },
    });
    expect(dup.statusCode).toBe(409);
  });
});
