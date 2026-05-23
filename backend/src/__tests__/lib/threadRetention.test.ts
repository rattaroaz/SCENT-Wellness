import { describe, it, expect } from "vitest";
import {
  CampaignStatus,
  ScheduledMessageStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  THREAD_RETENTION_DAYS,
  threadRetentionCutoff,
  purgeExpiredThreads,
} from "../../lib/threadRetention";
import {
  createTestPatient,
  createTestTemplate,
} from "../../test/helpers";

async function seedCampaign(opts: {
  status: CampaignStatus;
  completedAt: Date | null;
}) {
  const patient = await createTestPatient();
  const template = await createTestTemplate([{ body: "Hi", seconds: 1 }]);
  return prisma.activeCampaign.create({
    data: {
      patientId: patient.id,
      templateId: template.id,
      physicianPhone: "5555555550",
      status: opts.status,
      startedAt: new Date(opts.completedAt?.getTime() ?? Date.now()),
      completedAt: opts.completedAt,
      scheduled: {
        create: {
          templateMessageId: template.messages[0].id,
          body: "Hi",
          sendAt: new Date(),
          status: ScheduledMessageStatus.SENT,
          sentAt: opts.completedAt ?? new Date(),
        },
      },
    },
  });
}

describe("threadRetention", () => {
  it("threadRetentionCutoff is THREAD_RETENTION_DAYS ago", () => {
    const cutoff = threadRetentionCutoff();
    const expected = new Date(
      Date.now() - THREAD_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(2000);
  });

  it("purges COMPLETED threads older than retention window", async () => {
    const expiredAt = new Date(
      Date.now() - (THREAD_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
    );
    const old = await seedCampaign({
      status: CampaignStatus.COMPLETED,
      completedAt: expiredAt,
    });
    const fresh = await seedCampaign({
      status: CampaignStatus.COMPLETED,
      completedAt: new Date(),
    });
    const active = await seedCampaign({
      status: CampaignStatus.ACTIVE,
      completedAt: null,
    });

    const purged = await purgeExpiredThreads();
    expect(purged).toBeGreaterThanOrEqual(1);

    expect(
      await prisma.activeCampaign.findUnique({ where: { id: old.id } })
    ).toBeNull();
    expect(
      await prisma.activeCampaign.findUnique({ where: { id: fresh.id } })
    ).toBeTruthy();
    expect(
      await prisma.activeCampaign.findUnique({ where: { id: active.id } })
    ).toBeTruthy();
  });

  it("purges CANCELLED threads older than retention window", async () => {
    const expiredAt = new Date(
      Date.now() - (THREAD_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000
    );
    const cancelled = await seedCampaign({
      status: CampaignStatus.CANCELLED,
      completedAt: expiredAt,
    });

    await purgeExpiredThreads();
    expect(
      await prisma.activeCampaign.findUnique({ where: { id: cancelled.id } })
    ).toBeNull();
  });

  it("does nothing when no expired threads exist", async () => {
    const purged = await purgeExpiredThreads();
    expect(purged).toBe(0);
  });
});
