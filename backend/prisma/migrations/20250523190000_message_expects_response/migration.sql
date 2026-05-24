-- AlterTable
ALTER TABLE "ProcedureTemplate" ADD COLUMN "noReplyMessage" TEXT NOT NULL DEFAULT 'This message does not accept replies. Please contact your clinic if you need help.';

-- AlterTable
ALTER TABLE "TemplateMessage" ADD COLUMN "expectsResponse" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ScheduledMessage" ADD COLUMN "expectsResponse" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SimulatedSmsLog" ADD COLUMN "scheduledMessageId" TEXT;
ALTER TABLE "SimulatedSmsLog" ADD COLUMN "expectsResponse" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "SimulatedSmsLog_scheduledMessageId_idx" ON "SimulatedSmsLog"("scheduledMessageId");
