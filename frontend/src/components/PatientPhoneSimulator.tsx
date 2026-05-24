"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PhoneShell, type PhoneThreadMessage } from "@/components/phone/PhoneShell";
import { buildReplyThreadState } from "@/lib/smsThread";
import type { Patient } from "@/lib/types";

export function PatientPhoneSimulator({ patient }: { patient: Patient | null }) {
  const { patientSms, refreshSms } = useApp();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedReplyToId, setSelectedReplyToId] = useState<string | null>(
    null
  );

  const threadState = useMemo(
    () => buildReplyThreadState(patientSms),
    [patientSms]
  );

  const replyTargetId = useMemo(() => {
    if (
      selectedReplyToId &&
      threadState.unansweredOutbound.some((o) => o.id === selectedReplyToId)
    ) {
      return selectedReplyToId;
    }
    return threadState.defaultReplyTargetId;
  }, [selectedReplyToId, threadState]);

  useEffect(() => {
    if (
      selectedReplyToId &&
      !threadState.unansweredOutbound.some((o) => o.id === selectedReplyToId)
    ) {
      setSelectedReplyToId(null);
    }
  }, [selectedReplyToId, threadState.unansweredOutbound]);

  const replyTargetBody = useMemo(() => {
    if (!replyTargetId) return null;
    const log = patientSms.find((l) => l.id === replyTargetId);
    return log?.questionMessage ?? log?.body ?? null;
  }, [replyTargetId, patientSms]);

  const messages = useMemo((): PhoneThreadMessage[] => {
    return patientSms.map((log) => {
      const isOutbound = log.direction === "OUTBOUND";
      const answered = isOutbound
        ? threadState.answeredOutboundIds.has(log.id)
        : false;
      return {
        id: log.id,
        body: log.body,
        createdAt: log.createdAt,
        received: isOutbound,
        canSelectAsReplyTarget: isOutbound && !answered,
        isReplyTarget: isOutbound && log.id === replyTargetId,
        isAnswered: isOutbound && answered,
        expectsResponse: log.expectsResponse !== false,
      };
    });
  }, [patientSms, threadState.answeredOutboundIds, replyTargetId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!replyTargetId) {
      setError("Select a clinic message to reply to (tap a gray bubble).");
      return;
    }
    setError("");
    setSending(true);
    try {
      await api("/sms/simulate/reply", {
        method: "POST",
        body: JSON.stringify({
          outboundLogId: replyTargetId,
          answer: draft.trim(),
        }),
      });
      setDraft("");
      setSelectedReplyToId(null);
      await refreshSms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  const contactLabel = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Messages";

  const compose = (
    <form
      onSubmit={handleSend}
      className="shrink-0 border-t border-slate-200 bg-[#f6f6f6] px-2 py-2"
    >
      {replyTargetBody && (
        <p className="mb-1.5 truncate px-1 text-[10px] text-slate-500">
          Replying to:{" "}
          <span className="font-medium text-slate-700">{replyTargetBody}</span>
        </p>
      )}
      {threadState.unansweredOutbound.length > 1 && (
        <p className="mb-1 px-1 text-[10px] text-slate-400">
          Tap a clinic message above to choose which one you are answering.
        </p>
      )}
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            replyTargetId ? "Your reply…" : "Tap a clinic message to reply"
          }
          disabled={!replyTargetId || sending}
          className="min-h-[36px] flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] disabled:bg-slate-100 disabled:text-slate-400"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim() || !replyTargetId}
          aria-label="Send message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#007aff] text-white transition hover:bg-[#0066d6] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M3.4 20.4 20.4 12 3.4 3.6l1.6 7.2L14 12l-9 1.2-1.6 7.2z" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="mt-1.5 px-1 text-center text-[10px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );

  return (
    <PhoneShell
      phoneNumber={patient?.cellPhone ?? "0000000000"}
      contactName="SCENT Wellness"
      contactSubtitle={contactLabel}
      avatarLabel="SW"
      messages={messages}
      emptyHint="Clinic messages will appear here."
      compose={compose}
      onSelectReplyTarget={(id) => setSelectedReplyToId(id)}
    />
  );
}
