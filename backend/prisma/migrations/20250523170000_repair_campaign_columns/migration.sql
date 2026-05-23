-- Repair ActiveCampaign rows corrupted when cascade migration used SELECT *
-- Old column order: id, patientId, templateId, status, startedAt, physicianPhone
-- New column order: id, patientId, templateId, physicianPhone, status, startedAt

UPDATE "ActiveCampaign"
SET
  "physicianPhone" = "startedAt",
  "startedAt" = CASE
    WHEN "status" GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
      THEN datetime(CAST("status" AS INTEGER) / 1000, 'unixepoch')
    ELSE "status"
  END,
  "status" = "physicianPhone"
WHERE "physicianPhone" IN ('ACTIVE', 'COMPLETED', 'CANCELLED');
