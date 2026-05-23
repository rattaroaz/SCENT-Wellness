"use client";

import { FormEvent, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PhoneShell } from "@/components/phone/PhoneShell";
import type { Patient, SmsLog } from "@/lib/types";

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

export function PatientPhoneSimulator({ patient }: { patient: Patient | null }) {
  const { patientSms, refreshSms } = useApp();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const targetId = useMemo(() => replyTargetId(patientSms), [patientSms]);

  const messages = useMemo(
    () =>
      patientSms.map((log) => ({
        id: log.id,
        body: log.body,
        createdAt: log.createdAt,
        received: log.direction === "OUTBOUND",
      })),
    [patientSms]
  );

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

  const compose = (
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
    />
  );
}
