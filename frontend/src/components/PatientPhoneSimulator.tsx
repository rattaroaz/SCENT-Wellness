"use client";

import { FormEvent, useMemo, useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { Patient, SmsLog } from "@/lib/types";

/** Latest outbound not yet answered, else most recent outbound. */
function replyTargetId(logs: SmsLog[]): string | null {
  const outbound = logs.filter((l) => l.direction === "OUTBOUND");
  if (outbound.length === 0) return null;

  const answered = new Set(
    logs
      .filter((l) => l.direction === "INBOUND" && l.replyToLogId)
      .map((l) => l.replyToLogId)
  );

  for (let i = outbound.length - 1; i >= 0; i--) {
    if (!answered.has(outbound[i].id)) return outbound[i].id;
  }
  return outbound[outbound.length - 1].id;
}

function MessageBubble({ log }: { log: SmsLog }) {
  const received = log.direction === "OUTBOUND";
  return (
    <div className={`flex ${received ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-snug shadow-sm ${
          received
            ? "rounded-2xl rounded-tl-sm bg-[#e9e9eb] text-black"
            : "rounded-2xl rounded-tr-sm bg-[#007aff] text-white"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{log.body}</p>
        <p
          className={`mt-0.5 text-right text-[11px] ${
            received ? "text-black/45" : "text-white/70"
          }`}
        >
          {new Date(log.createdAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

export function PatientPhoneSimulator({ patient }: { patient: Patient | null }) {
  const { patientSms, refreshSms } = useApp();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const targetId = useMemo(() => replyTargetId(patientSms), [patientSms]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [patientSms]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!targetId) {
      setError("No message from the clinic to reply to yet.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await api("/sms/simulate/reply", {
        method: "POST",
        body: JSON.stringify({
          outboundLogId: targetId,
          answer: draft.trim(),
        }),
      });
      setDraft("");
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

  return (
    <div className="flex h-full min-h-0 flex-col items-center overflow-hidden bg-slate-200 p-2">
      <div className="flex h-full w-full max-w-[280px] flex-col overflow-hidden rounded-[2rem] border-[3px] border-slate-800 bg-black shadow-xl">
        {/* Status bar */}
        <div className="flex shrink-0 items-center justify-between bg-black px-5 pt-2 pb-0.5 text-[10px] font-medium text-white">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-3 rounded-sm border border-white/80" />
            <span className="text-[9px]">5G</span>
            <span className="ml-0.5 inline-block h-2.5 w-4 rounded-sm bg-white/90" />
          </div>
        </div>

        {/* Messages header */}
        <div className="shrink-0 border-b border-white/10 bg-[#1c1c1e] px-3 py-2.5 text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#34c759] text-xs font-bold text-white">
            SW
          </div>
          <p className="truncate text-sm font-semibold text-white">
            SCENT Wellness
          </p>
          <p className="truncate text-[10px] text-white/50">{contactLabel}</p>
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto bg-white px-3 py-3">
          {patientSms.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Clinic messages will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {patientSms.map((log) => (
                <MessageBubble key={log.id} log={log} />
              ))}
              <div ref={threadEndRef} />
            </div>
          )}
        </div>

        {/* Compose bar — single Send, no dropdown */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-slate-200 bg-[#f6f6f6] px-2 py-2"
        >
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Text Message"
              disabled={!targetId || sending}
              className="min-h-[36px] flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-[15px] outline-none focus:border-[#007aff] focus:ring-1 focus:ring-[#007aff] disabled:bg-slate-100 disabled:text-slate-400"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || !targetId}
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

        {/* Home indicator */}
        <div className="shrink-0 bg-[#f6f6f6] pb-1.5 pt-0.5">
          <div className="mx-auto h-1 w-24 rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
