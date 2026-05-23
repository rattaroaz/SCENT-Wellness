-- Fix campaign rows where status is still a timestamp ms value
UPDATE "ActiveCampaign"
SET
  "startedAt" = datetime(CAST("status" AS INTEGER) / 1000, 'unixepoch'),
  "status" = 'ACTIVE'
WHERE "status" NOT IN ('ACTIVE', 'COMPLETED', 'CANCELLED')
  AND "status" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*';

-- Fix rows where physicianPhone still holds status enum
UPDATE "ActiveCampaign"
SET
  "physicianPhone" = "startedAt",
  "startedAt" = CASE
    WHEN "status" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      THEN datetime(CAST("status" AS INTEGER) / 1000, 'unixepoch')
    ELSE "startedAt"
  END,
  "status" = "physicianPhone"
WHERE "physicianPhone" IN ('ACTIVE', 'COMPLETED', 'CANCELLED');
