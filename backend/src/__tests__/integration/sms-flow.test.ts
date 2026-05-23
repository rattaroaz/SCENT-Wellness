import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../../index";
import { prisma } from "../../lib/prisma";
import { processDueMessages } from "../../services/scheduler";
import {
  createTestUser,
  getAuthHeader,
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";
import { Role } from "@prisma/client";

describe("integration: full SMS flow (campaign → scheduler → reply → physician forward)", () => {
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

  it("runs the end-to-end flow and writes audit rows for each step", async () => {
    const patient = await createTestPatient({ cellPhone: "555-100-2000" });
    const template = await createTestTemplate([
      { body: "How are you?", seconds: 0 },
    ]);

    const start = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: {
        patientId: patient.id,
        templateId: template.id,
        physicianPhone: "5555555551",
      },
    });
    expect(start.statusCode).toBe(200);
    const campaignId = JSON.parse(start.body).campaign.id;

    const tick = await processDueMessages();
    expect(tick.sent).toBeGreaterThanOrEqual(1);

    const outbound = await prisma.simulatedSmsLog.findFirstOrThrow({
      where: { campaignId, direction: "OUTBOUND" },
    });

    const reply = await app.inject({
      method: "POST",
      url: "/sms/simulate/reply",
      headers: getAuthHeader(token),
      payload: { outboundLogId: outbound.id, answer: "Feeling okay" },
    });
    expect(reply.statusCode).toBe(200);

    const physicianInbox = await app.inject({
      method: "GET",
      url: `/sms/physician-inbox?phone=5555555551`,
      headers: getAuthHeader(token),
    });
    const entries = JSON.parse(physicianInbox.body).entries;
    expect(entries.some((e: { patientAnswer: string }) => e.patientAnswer === "Feeling okay")).toBe(true);

    const auditCount = await prisma.auditLog.count({
      where: { resourceId: campaignId, action: "campaign.start" },
    });
    expect(auditCount).toBeGreaterThanOrEqual(1);

    const completed = await prisma.activeCampaign.findUniqueOrThrow({
      where: { id: campaignId },
    });
    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeTruthy();
  });
});
