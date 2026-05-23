import { prisma } from "./prisma";
import { getLogger } from "./logger";

const log = getLogger("retention");

export const PATIENT_RETENTION_DAYS = Number(
  process.env.PATIENT_RETENTION_DAYS || "30"
);

export function retentionCutoffDate(): Date {
  return new Date(
    Date.now() - PATIENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
}

export async function purgeExpiredPatients(): Promise<number> {
  const cutoff = retentionCutoffDate();
  const expired = await prisma.patient.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, mrn: true },
  });

  if (expired.length === 0) return 0;

  const result = await prisma.patient.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  log.info(
    { count: result.count, cutoff: cutoff.toISOString(), days: PATIENT_RETENTION_DAYS },
    "purged expired patients"
  );
  return result.count;
}
