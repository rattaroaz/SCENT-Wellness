import { describe, it, expect, beforeEach } from "vitest";
import {
  CampaignStatus,
  ScheduledMessageStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { processDueMessages } from "../../services/scheduler";
import {
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";

describe("scheduler", () => {
  let campaignId: string;

  beforeEach(async () => {
    const patient = await createTestPatient({ cellPhone: "555-000-1111" });
    const template = await createTestTemplate([
      { body: "Due now", seconds: 0 },
    ]);

    const campaign = await prisma.activeCampaign.create({
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
      include: { scheduled: true },
    });
    campaignId = campaign.id;
  });

  it("processDueMessages sends pending messages and marks them SENT", async () => {
    const sent = await processDueMessages();
    expect(sent).toBeGreaterThanOrEqual(1);

    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { campaignId },
    });
    expect(scheduled?.status).toBe(ScheduledMessageStatus.SENT);
  });

  it("completes campaign when no pending messages remain", async () => {
    await processDueMessages();
    const campaign = await prisma.activeCampaign.findUnique({
      where: { id: campaignId },
    });
    expect(campaign?.status).toBe(CampaignStatus.COMPLETED);
    expect(campaign?.completedAt).toBeTruthy();
  });
});
