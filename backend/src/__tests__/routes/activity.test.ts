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

describe("Activity routes", () => {
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

  it("GET /activity/tree returns patients with campaign branches", async () => {
    const patient = await createTestPatient();
    const template = await createTestTemplate([{ body: "Hi", seconds: 1 }]);
    await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });

    const res = await app.inject({
      method: "GET",
      url: "/activity/tree",
      headers: getAuthHeader(token),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const node = body.patients.find((p: { id: string }) => p.id === patient.id);
    expect(node).toBeTruthy();
    expect(node.campaigns.length).toBeGreaterThan(0);
    expect(node.campaigns[0].scheduled.length).toBeGreaterThan(0);
  });

  it("GET /activity/tree excludes COMPLETED campaigns", async () => {
    const { prisma } = await import("../../lib/prisma");
    const patient = await createTestPatient();
    const template = await createTestTemplate([{ body: "Done", seconds: 1 }]);
    const startRes = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });
    const campaignId = JSON.parse(startRes.body).campaign.id;
    await prisma.activeCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    const tree = await app.inject({
      method: "GET",
      url: "/activity/tree",
      headers: getAuthHeader(token),
    });
    const found = JSON.parse(tree.body).patients.find(
      (p: { id: string }) => p.id === patient.id
    );
    expect(found).toBeUndefined();
  });

  it("GET /activity/completed includes completed threads with retentionDays", async () => {
    const { prisma } = await import("../../lib/prisma");
    const patient = await createTestPatient();
    const template = await createTestTemplate([{ body: "Done", seconds: 1 }]);
    const startRes = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: getAuthHeader(token),
      payload: { patientId: patient.id, templateId: template.id },
    });
    const campaignId = JSON.parse(startRes.body).campaign.id;
    await prisma.activeCampaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    const res = await app.inject({
      method: "GET",
      url: "/activity/completed",
      headers: getAuthHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(typeof body.retentionDays).toBe("number");
    expect(body.threads.find((t: { id: string }) => t.id === campaignId)).toBeTruthy();
  });

  it("requires authentication", async () => {
    const res = await app.inject({ method: "GET", url: "/activity/tree" });
    expect(res.statusCode).toBe(401);
  });
});
