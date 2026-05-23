-- Redefine PhysicianForward with unique phone
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_PhysicianForward" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "physicianPhone" TEXT NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO "new_PhysicianForward" ("id", "physicianPhone", "enabled")
SELECT "id", "physicianPhone", "enabled" FROM "PhysicianForward";

DROP TABLE "PhysicianForward";
ALTER TABLE "new_PhysicianForward" RENAME TO "PhysicianForward";
CREATE UNIQUE INDEX "PhysicianForward_physicianPhone_key" ON "PhysicianForward"("physicianPhone");

CREATE TABLE "new_PhysicianForwardEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "physicianPhone" TEXT NOT NULL DEFAULT '',
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

INSERT INTO "new_PhysicianForwardEntry" ("id", "lastName", "firstName", "dateOfBirth", "mrn", "questionMessage", "patientAnswer", "inboundLogId", "createdAt", "physicianPhone")
SELECT "id", "lastName", "firstName", "dateOfBirth", "mrn", "questionMessage", "patientAnswer", "inboundLogId", "createdAt", '' FROM "PhysicianForwardEntry";

DROP TABLE "PhysicianForwardEntry";
ALTER TABLE "new_PhysicianForwardEntry" RENAME TO "PhysicianForwardEntry";
CREATE INDEX "PhysicianForwardEntry_physicianPhone_idx" ON "PhysicianForwardEntry"("physicianPhone");

PRAGMA foreign_keys=ON;
