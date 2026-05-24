import type { SmsLog } from "@/lib/types";

export type ReplyThreadState = {
  /** Outbound log ids that already have a patient reply linked. */
  answeredOutboundIds: Set<string>;
  /** Outbound messages still waiting for a patient reply (in send order). */
  unansweredOutbound: SmsLog[];
  /** Suggested default: oldest unanswered clinic message. */
  defaultReplyTargetId: string | null;
};

export function buildReplyThreadState(logs: SmsLog[]): ReplyThreadState {
  const answeredOutboundIds = new Set<string>();
  for (const log of logs) {
    if (log.direction === "INBOUND" && log.replyToLogId) {
      answeredOutboundIds.add(log.replyToLogId);
    }
  }

  const unansweredOutbound = logs.filter(
    (l) => l.direction === "OUTBOUND" && !answeredOutboundIds.has(l.id)
  );

  return {
    answeredOutboundIds,
    unansweredOutbound,
    defaultReplyTargetId: unansweredOutbound[0]?.id ?? null,
  };
}

export function isOutboundAnswered(
  outboundId: string,
  answeredOutboundIds: Set<string>
): boolean {
  return answeredOutboundIds.has(outboundId);
}
