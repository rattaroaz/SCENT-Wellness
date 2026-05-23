import { prisma } from "./prisma";
import { getLogger } from "./logger";

const auditLog = getLogger("audit");

export type AuditAction =
  | "patient.create"
  | "patient.delete"
  | "patient.purge"
  | "patient.read"
  | "patient.search"
  | "template.create"
  | "template.delete"
  | "template.update"
  | "activity.tree.read"
  | "activity.completed.read"
  | "template.read"
  | "template.list"
  | "campaign.start"
  | "campaign.cancel"
  | "campaign.read"
  | "sms.reply"
  | "sms.inbox.read"
  | "physician.config.update"
  | "auth.login"
  | "auth.login_failed";

export async function recordAudit(params: {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const metadataJson = params.metadata
    ? JSON.stringify(params.metadata)
  : null;

  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: metadataJson,
      },
    });
    auditLog.info(
      {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
      },
      "audit event recorded"
    );
  } catch (err) {
    auditLog.error({ err, ...params }, "failed to record audit event");
  }
}
