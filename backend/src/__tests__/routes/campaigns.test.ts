import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../index";
import { FastifyInstance } from "fastify";
import {
  createTestUser,
  getAuthHeader,
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";
import { Role } from "@prisma/client";

describe("Campaign routes", () => {
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

  async function startCampaign() {
    const patient = await createTestPatient();
    const template = await createTestTemplate([
      { body: "Welcome", seconds: 1 },
      { body: "Follow up", seconds: 2 },
    ]);
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: {
        patientId: patient.id,
        templateId: template.id,
        physicianPhone: "5555555550",
      },
    });
    return { res, patientId: patient.id, templateId: template.id };
  }

  it("POST /campaigns starts a campaign", async () => {
    const { res } = await startCampaign();
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.campaign.status).toBe("ACTIVE");
    expect(body.campaign.scheduled.length).toBe(2);
    expect(body.alreadyActive).toBe(false);
  });

  it("POST /campaigns returns existing active campaign", async () => {
    const { patientId, templateId } = await startCampaign();
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId, templateId },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).alreadyActive).toBe(true);
  });

  it("POST /campaigns/:id/cancel cancels campaign", async () => {
    const { res } = await startCampaign();
    const campaignId = JSON.parse(res.body).campaign.id;

    const cancel = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/cancel`,
      headers: getAuthHeader(token),
    });
    expect(cancel.statusCode).toBe(200);
    const body = JSON.parse(cancel.body);
    expect(body.campaign.status).toBe("CANCELLED");
    expect(body.campaign.completedAt).toBeTruthy();
  });

  it("POST /campaigns rejects invalid payload with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /campaigns rejects empty template with 400", async () => {
    const { createTestPatient } = await import("../../test/helpers");
    const { prisma } = await import("../../lib/prisma");
    const patient = await createTestPatient();
    const emptyTpl = await prisma.procedureTemplate.create({
      data: { name: `Empty-${Date.now()}` },
    });
    const res = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: emptyTpl.id },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /campaigns/:id/cancel returns 404 for unknown", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/campaigns/does-not-exist/cancel",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /campaigns/:id returns 404 for unknown", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/campaigns/missing",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /campaigns lists with patient filter", async () => {
    const { res } = await startCampaign();
    const campaign = JSON.parse(res.body).campaign;
    const list = await app.inject({
      method: "GET",
      url: `/campaigns?patientId=${campaign.patientId}`,
      headers: getAuthHeader(token),
    });
    expect(list.statusCode).toBe(200);
    const body = JSON.parse(list.body);
    expect(body.campaigns.length).toBeGreaterThan(0);
  });

  it("GET /campaigns/:id returns hydrated campaign", async () => {
    const { res } = await startCampaign();
    const campaignId = JSON.parse(res.body).campaign.id;
    const get = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}`,
      headers: getAuthHeader(token),
    });
    expect(get.statusCode).toBe(200);
    const body = JSON.parse(get.body);
    expect(body.campaign.template).toBeDefined();
    expect(Array.isArray(body.campaign.scheduled)).toBe(true);
  });
});
