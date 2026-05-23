-- AlterTable
ALTER TABLE "ActiveCampaign" ADD COLUMN "completedAt" DATETIME;

-- Backfill completed/cancelled campaigns
UPDATE "ActiveCampaign"
SET "completedAt" = "startedAt"
WHERE "status" IN ('COMPLETED', 'CANCELLED') AND "completedAt" IS NULL;

CREATE INDEX "ActiveCampaign_status_completedAt_idx" ON "ActiveCampaign"("status", "completedAt");
