import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CampaignStatus,
  ScheduledMessageStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  processDueMessages,
  _resetRetentionCadenceForTests,
} from "../../services/scheduler";
import {
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";

async function seedDueCampaign(): Promise<string> {
  const patient = await createTestPatient({ cellPhone: "555-000-1111" });
  const template = await createTestTemplate([{ body: "Due now", seconds: 0 }]);
  const c = await prisma.activeCampaign.create({
    data: {
      patientId: patient.id,
      templateId: template.id,
      physicianPhone: "5555555550",
      status: CampaignStatus.ACTIVE,
      startedAt: new Date(),
      scheduled: {
        create: {
          templateMessageId: template.messages[0].id,
          body: "Due now",
          sendAt: new Date(Date.now() - 1000),
          status: ScheduledMessageStatus.PENDING,
        },
      },
    },
  });
  return c.id;
}

describe("scheduler", () => {
  let campaignId: string;

  beforeEach(async () => {
    campaignId = await seedDueCampaign();
  });

  it("processDueMessages sends pending messages and marks them SENT", async () => {
    const result = await processDueMessages();
    expect(result.sent).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
    expect(typeof result.durationMs).toBe("number");

    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { campaignId },
    });
    expect(scheduled?.status).toBe(ScheduledMessageStatus.SENT);
  });

  it("completes campaign when no pending messages remain", async () => {
    const result = await processDueMessages();
    expect(result.completed).toBeGreaterThanOrEqual(1);
    const campaign = await prisma.activeCampaign.findUnique({
      where: { id: campaignId },
    });
    expect(campaign?.status).toBe(CampaignStatus.COMPLETED);
    expect(campaign?.completedAt).toBeTruthy();
  });

  it("does not re-send messages already marked SENT", async () => {
    await processDueMessages();
    const second = await processDueMessages();
    expect(second.sent).toBe(0);
  });

  it("emits an outbound SimulatedSmsLog for each sent message", async () => {
    await processDueMessages();
    const logs = await prisma.simulatedSmsLog.findMany({ where: { campaignId } });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].direction).toBe("OUTBOUND");
  });

  it("ignores PENDING messages whose campaign is CANCELLED", async () => {
    await prisma.activeCampaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED, completedAt: new Date() },
    });
    const result = await processDueMessages();
    expect(result.sent).toBe(0);
  });

  it("runs retention purge after cadence elapses", async () => {
    _resetRetentionCadenceForTests();
    const result = await processDueMessages();
    expect(result.retentionRan).toBe(true);
  });

  it("skips retention purge on rapid successive ticks", async () => {
    _resetRetentionCadenceForTests();
    await processDueMessages();
    const second = await processDueMessages();
    expect(second.retentionRan).toBe(false);
  });

  it("increments failed and marks message FAILED when send transaction throws", async () => {
    const txSpy = vi
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(new Error("simulated send failure"));

    const result = await processDueMessages();
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const failedMsg = await prisma.scheduledMessage.findFirst({
      where: { campaignId, status: ScheduledMessageStatus.FAILED },
    });
    expect(failedMsg).toBeTruthy();

    txSpy.mockRestore();
  });
});
