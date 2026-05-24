import {
  CampaignStatus,
  ScheduledMessageStatus,
  SmsDirection,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { getLogger } from "../lib/logger";
import { purgeExpiredPatients } from "../lib/patientRetention";
import { purgeExpiredThreads } from "../lib/threadRetention";

const log = getLogger("scheduler");
const APP_FROM = "SCENT-App";

let lastRetentionRun = 0;
const RETENTION_INTERVAL_MS = 60 * 60 * 1000;

/** Test helper: reset the retention cadence so subsequent ticks will run it. */
export function _resetRetentionCadenceForTests(): void {
  lastRetentionRun = 0;
}

export type SchedulerTickResult = {
  sent: number;
  failed: number;
  completed: number;
  retentionRan: boolean;
  durationMs: number;
};

export async function processDueMessages(): Promise<SchedulerTickResult> {
  const tickStart = Date.now();
  const now = new Date();
  const due = await prisma.scheduledMessage.findMany({
    where: {
      status: ScheduledMessageStatus.PENDING,
      sendAt: { lte: now },
      campaign: { status: CampaignStatus.ACTIVE },
    },
    include: {
      campaign: { include: { patient: true } },
    },
    take: 50,
  });

  let sent = 0;
  let failed = 0;
  for (const msg of due) {
    try {
      const patient = msg.campaign.patient;
      await prisma.$transaction(async (tx) => {
        await tx.simulatedSmsLog.create({
          data: {
            direction: SmsDirection.OUTBOUND,
            fromNumber: APP_FROM,
            toNumber: patient.cellPhone,
            body: msg.body,
            patientId: patient.id,
            campaignId: msg.campaignId,
            scheduledMessageId: msg.id,
            expectsResponse: msg.expectsResponse,
            questionMessage: msg.body,
          },
        });

        await tx.scheduledMessage.update({
          where: { id: msg.id },
          data: {
            status: ScheduledMessageStatus.SENT,
            sentAt: new Date(),
          },
        });
      });
      log.debug(
        { messageId: msg.id, campaignId: msg.campaignId, patientId: patient.id },
        "scheduled message sent"
      );
      sent++;
    } catch (err) {
      failed++;
      log.error(
        { err, messageId: msg.id, campaignId: msg.campaignId },
        "failed to send scheduled message"
      );
      try {
        await prisma.scheduledMessage.update({
          where: { id: msg.id },
          data: { status: ScheduledMessageStatus.FAILED },
        });
      } catch (markErr) {
        log.error(
          { err: markErr, messageId: msg.id },
          "failed to mark scheduled message as FAILED"
        );
      }
    }
  }

  const activeCampaigns = await prisma.activeCampaign.findMany({
    where: { status: CampaignStatus.ACTIVE },
    select: { id: true },
  });

  let completed = 0;
  for (const c of activeCampaigns) {
    try {
      const pending = await prisma.scheduledMessage.count({
        where: { campaignId: c.id, status: ScheduledMessageStatus.PENDING },
      });
      if (pending === 0) {
        await prisma.activeCampaign.update({
          where: { id: c.id },
          data: {
            status: CampaignStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
        completed++;
        log.info({ campaignId: c.id }, "campaign completed");
      }
    } catch (err) {
      log.error({ err, campaignId: c.id }, "failed to complete campaign");
    }
  }

  if (sent > 0 || failed > 0) {
    log.info({ sent, failed, completed }, "scheduler batch summary");
  }

  const tickMs = Date.now();
  let retentionRan = false;
  if (tickMs - lastRetentionRun >= RETENTION_INTERVAL_MS) {
    lastRetentionRun = tickMs;
    retentionRan = true;
    try {
      const [patients, threads] = await Promise.all([
        purgeExpiredPatients(),
        purgeExpiredThreads(),
      ]);
      log.info(
        { patientsPurged: patients, threadsPurged: threads },
        "retention purge tick"
      );
    } catch (err) {
      log.error({ err }, "retention purge failed");
    }
  }

  const durationMs = Date.now() - tickStart;
  if (durationMs > 1000) {
    log.warn({ durationMs, sent, failed, completed }, "slow scheduler tick");
  }

  return { sent, failed, completed, retentionRan, durationMs };
}

export function startScheduler(intervalMs = 1000): NodeJS.Timeout {
  log.info({ intervalMs }, "scheduler started");
  return setInterval(() => {
    processDueMessages().catch((err) => log.error({ err }, "scheduler error"));
  }, intervalMs);
}
