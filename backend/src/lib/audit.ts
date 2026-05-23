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
  | "physician.config.read"
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed";

export type AuditParams = {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  /** Correlation ID linking the audit row to an HTTP request log entry. */
  reqId?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAudit(params: AuditParams): Promise<void> {
  const metadataPayload = params.reqId
    ? { ...(params.metadata ?? {}), reqId: params.reqId }
    : params.metadata;
  const metadataJson = metadataPayload ? JSON.stringify(metadataPayload) : null;

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
    auditLog.debug(
      {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        reqId: params.reqId,
      },
      "audit event recorded"
    );
  } catch (err) {
    auditLog.error(
      { err, action: params.action, resource: params.resource, reqId: params.reqId },
      "failed to record audit event"
    );
  }
}
