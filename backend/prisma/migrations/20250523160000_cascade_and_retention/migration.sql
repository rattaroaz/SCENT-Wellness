-- Redefine tables with ON DELETE CASCADE for patient/template cleanup
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ActiveCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "physicianPhone" TEXT NOT NULL DEFAULT '5555555550',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActiveCampaign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActiveCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProcedureTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActiveCampaign" ("id", "patientId", "templateId", "physicianPhone", "status", "startedAt")
SELECT "id", "patientId", "templateId", "physicianPhone", "status", "startedAt" FROM "ActiveCampaign";
DROP TABLE "ActiveCampaign";
ALTER TABLE "new_ActiveCampaign" RENAME TO "ActiveCampaign";

CREATE TABLE "new_SimulatedSmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "patientId" TEXT,
    "campaignId" TEXT,
    "replyToLogId" TEXT,
    "questionMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulatedSmsLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimulatedSmsLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ActiveCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SimulatedSmsLog_replyToLogId_fkey" FOREIGN KEY ("replyToLogId") REFERENCES "SimulatedSmsLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SimulatedSmsLog" SELECT * FROM "SimulatedSmsLog";
DROP TABLE "SimulatedSmsLog";
ALTER TABLE "new_SimulatedSmsLog" RENAME TO "SimulatedSmsLog";

CREATE INDEX IF NOT EXISTS "Patient_createdAt_idx" ON "Patient"("createdAt");

PRAGMA foreign_keys=ON;
