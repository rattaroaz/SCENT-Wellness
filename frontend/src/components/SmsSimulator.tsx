"use client";

import { useState } from "react";
import { PatientPhoneSimulator } from "@/components/PatientPhoneSimulator";
import { PhysicianPhonesPanel } from "@/components/phone/PhysicianPhonesPanel";
import { ResizableSplit } from "@/components/resize/ResizableSplit";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { clientLogger } from "@/lib/logger";

export function SmsSimulator() {
  const { patient, refreshSms } = useApp();
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  async function clearAllMessages() {
    if (
      !confirm(
        "Clear all messages on every simulated phone (patient and physician)? This cannot be undone."
      )
    ) {
      return;
    }

    setError("");
    setClearing(true);
    try {
      await api<{ ok: boolean; logs: number; forwards: number }>(
        "/sms/simulate/clear",
        { method: "POST" }
      );
      await refreshSms();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not clear messages";
      setError(msg);
      clientLogger.error("simulator clear failed", { err: String(err) });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-slate-200 bg-slate-100">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          SMS Simulator
        </p>
        <button
          type="button"
          onClick={clearAllMessages}
          disabled={clearing}
          className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {clearing ? "Clearing…" : "Clear all messages"}
        </button>
      </div>
      {error && (
        <p className="shrink-0 bg-red-50 px-4 py-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      <ResizableSplit
        direction="horizontal"
        initialSize={280}
        minSize={200}
        maxSize={500}
        storageKey="scent-sms-patient-width"
        className="min-h-0 flex-1"
        first={<PatientPhoneSimulator patient={patient} />}
        second={<PhysicianPhonesPanel />}
      />
    </div>
  );
}
