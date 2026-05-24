import { describe, it, expect } from "vitest";
import { buildReplyThreadState, isOutboundAnswered } from "@/lib/smsThread";
import type { SmsLog } from "@/lib/types";

function log(partial: Partial<SmsLog> & Pick<SmsLog, "id" | "direction" | "body">): SmsLog {
  return {
    fromNumber: "x",
    toNumber: "y",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("buildReplyThreadState", () => {
  it("tracks answered outbounds via inbound replyToLogId", () => {
    const logs: SmsLog[] = [
      log({ id: "o1", direction: "OUTBOUND", body: "Q1" }),
      log({ id: "i1", direction: "INBOUND", body: "A1", replyToLogId: "o1" }),
      log({ id: "o2", direction: "OUTBOUND", body: "Q2" }),
    ];
    const state = buildReplyThreadState(logs);
    expect(state.answeredOutboundIds.has("o1")).toBe(true);
    expect(state.answeredOutboundIds.has("o2")).toBe(false);
    expect(state.unansweredOutbound.map((o) => o.id)).toEqual(["o2"]);
    expect(state.defaultReplyTargetId).toBe("o2");
  });

  it("defaults to oldest unanswered when multiple are open", () => {
    const logs: SmsLog[] = [
      log({ id: "o1", direction: "OUTBOUND", body: "First" }),
      log({ id: "o2", direction: "OUTBOUND", body: "Second" }),
    ];
    const state = buildReplyThreadState(logs);
    expect(state.defaultReplyTargetId).toBe("o1");
    expect(state.unansweredOutbound).toHaveLength(2);
  });

  it("isOutboundAnswered reflects answered set membership", () => {
    const answered = new Set(["o1"]);
    expect(isOutboundAnswered("o1", answered)).toBe(true);
    expect(isOutboundAnswered("o2", answered)).toBe(false);
  });
});
