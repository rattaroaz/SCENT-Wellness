import { prisma } from "./prisma";
import { getLogger } from "./logger";

const log = getLogger("campaign-repair");

/**
 * Fixes ActiveCampaign rows where status holds a timestamp (migration column swap).
 * Safe to run repeatedly.
 */
export async function repairCorruptedCampaigns(): Promise<number> {
  let fixed = 0;

  // status = ms timestamp, physicianPhone already a phone number
  fixed += await prisma.$executeRaw`
    UPDATE "ActiveCampaign"
    SET
      "startedAt" = datetime(CAST("status" AS INTEGER) / 1000, 'unixepoch'),
      "status" = 'ACTIVE'
    WHERE "status" NOT IN ('ACTIVE', 'COMPLETED', 'CANCELLED')
      AND "status" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
  `;

  // physicianPhone wrongly holds status enum (full column swap from bad SELECT *)
  fixed += await prisma.$executeRaw`
    UPDATE "ActiveCampaign"
    SET
      "physicianPhone" = "startedAt",
      "startedAt" = CASE
        WHEN "status" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
          THEN datetime(CAST("status" AS INTEGER) / 1000, 'unixepoch')
        ELSE "startedAt"
      END,
      "status" = "physicianPhone"
    WHERE "physicianPhone" IN ('ACTIVE', 'COMPLETED', 'CANCELLED')
  `;

  // startedAt wrongly holds phone digits
  fixed += await prisma.$executeRaw`
    UPDATE "ActiveCampaign"
    SET "startedAt" = CURRENT_TIMESTAMP
    WHERE "startedAt" GLOB '555*'
      OR "startedAt" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  `;

  if (fixed > 0) {
    log.warn({ rowsAffected: fixed }, "repaired corrupted campaign rows");
  }
  return fixed;
}
