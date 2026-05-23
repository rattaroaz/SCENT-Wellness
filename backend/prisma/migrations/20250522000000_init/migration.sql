-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "cellPhone" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProcedureTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdByUserId" TEXT,
    CONSTRAINT "ProcedureTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "weeks" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 0,
    "hours" INTEGER NOT NULL DEFAULT 0,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TemplateMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProcedureTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActiveCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActiveCampaign_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActiveCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProcedureTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "templateMessageId" TEXT NOT NULL,
    "sendAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "body" TEXT NOT NULL,
    CONSTRAINT "ScheduledMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ActiveCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduledMessage_templateMessageId_fkey" FOREIGN KEY ("templateMessageId") REFERENCES "TemplateMessage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulatedSmsLog" (
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
    CONSTRAINT "SimulatedSmsLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SimulatedSmsLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ActiveCampaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SimulatedSmsLog_replyToLogId_fkey" FOREIGN KEY ("replyToLogId") REFERENCES "SimulatedSmsLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhysicianForward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "physicianPhone" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "PhysicianForwardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "questionMessage" TEXT NOT NULL,
    "patientAnswer" TEXT NOT NULL,
    "inboundLogId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhysicianForwardEntry_inboundLogId_fkey" FOREIGN KEY ("inboundLogId") REFERENCES "SimulatedSmsLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedureTemplate_name_key" ON "ProcedureTemplate"("name");
