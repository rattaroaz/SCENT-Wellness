import { CampaignStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { getLogger } from "./logger";

const log = getLogger("retention");

export const THREAD_RETENTION_DAYS = Number(
  process.env.THREAD_RETENTION_DAYS || "30"
);

export function threadRetentionCutoff(): Date {
  return new Date(
    Date.now() - THREAD_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
}

export async function purgeExpiredThreads(): Promise<number> {
  const cutoff = threadRetentionCutoff();
  const result = await prisma.activeCampaign.deleteMany({
    where: {
      status: { in: [CampaignStatus.COMPLETED, CampaignStatus.CANCELLED] },
      completedAt: { lt: cutoff },
    },
  });

  if (result.count > 0) {
    log.info(
      { count: result.count, cutoff: cutoff.toISOString(), days: THREAD_RETENTION_DAYS },
      "purged expired completed threads"
    );
  }
  return result.count;
}
