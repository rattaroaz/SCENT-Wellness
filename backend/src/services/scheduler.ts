import {
  CampaignStatus,
  ScheduledMessageStatus,
  SmsDirection,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

const APP_FROM = "SCENT-App";

export async function processDueMessages(): Promise<number> {
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
  for (const msg of due) {
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
    sent++;
  }

  const activeCampaigns = await prisma.activeCampaign.findMany({
    where: { status: CampaignStatus.ACTIVE },
    select: { id: true },
  });

  for (const c of activeCampaigns) {
    const pending = await prisma.scheduledMessage.count({
      where: { campaignId: c.id, status: ScheduledMessageStatus.PENDING },
    });
    if (pending === 0) {
      await prisma.activeCampaign.update({
        where: { id: c.id },
        data: { status: CampaignStatus.COMPLETED },
      });
    }
  }

  return sent;
}

export function startScheduler(intervalMs = 1000): NodeJS.Timeout {
  return setInterval(() => {
    processDueMessages().catch((err) =>
      console.error("[scheduler]", err)
    );
  }, intervalMs);
}
