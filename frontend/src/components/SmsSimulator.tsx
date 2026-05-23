"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { PatientPhoneSimulator } from "@/components/PatientPhoneSimulator";
import { ResizableSplit } from "@/components/resize/ResizableSplit";

export function SmsSimulator() {
  const { physicianInbox, user, patient } = useApp();
  const [physicianPhone, setPhysicianPhone] = useState("");
  const [configId, setConfigId] = useState("");

  async function loadPhysicianConfig() {
    const res = await api<{
      configs: { id: string; physicianPhone: string; enabled: boolean }[];
    }>("/sms/physician-config");
    const c = res.configs[0];
    if (c) {
      setConfigId(c.id);
      setPhysicianPhone(c.physicianPhone);
    }
  }

  async function savePhysicianConfig() {
    if (!configId || user?.role !== "ADMIN") return;
    await api(`/sms/physician-config/${configId}`, {
      method: "PUT",
      body: JSON.stringify({ physicianPhone }),
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-slate-200 bg-slate-100">
      <p className="shrink-0 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        SMS Simulator
      </p>
      <ResizableSplit
        direction="horizontal"
        initialSize={320}
        minSize={200}
        maxSize={900}
        storageKey="scent-sms-patient-width"
        className="min-h-0 flex-1"
        first={<PatientPhoneSimulator patient={patient} />}
        second={
          <div className="flex h-full min-w-0 flex-col bg-white">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
              <p className="text-xs font-medium text-slate-600">
                Physician number inbox
              </p>
              {user?.role === "ADMIN" && (
                <button
                  type="button"
                  className="text-[10px] text-brand-600 hover:underline"
                  onClick={loadPhysicianConfig}
                >
                  Load config
                </button>
              )}
            </div>
            {user?.role === "ADMIN" && configId && (
              <div className="flex shrink-0 gap-1 border-b border-slate-50 px-3 py-2">
                <input
                  className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-xs"
                  value={physicianPhone}
                  onChange={(e) => setPhysicianPhone(e.target.value)}
                />
                <button
                  type="button"
                  onClick={savePhysicianConfig}
                  className="rounded bg-slate-200 px-2 text-xs"
                >
                  Save
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
              {physicianInbox.length === 0 && (
                <p className="text-xs text-slate-400">
                  Forwards appear when the patient replies.
                </p>
              )}
              {[...physicianInbox].reverse().map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs"
                >
                  <p>
                    <strong>
                      {e.lastName}, {e.firstName}
                    </strong>
                  </p>
                  <p>DOB: {e.dateOfBirth}</p>
                  <p>MRN: {e.mrn}</p>
                  <p className="mt-2 text-slate-600">
                    <span className="font-medium">Question:</span>{" "}
                    {e.questionMessage}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Answer:</span>{" "}
                    {e.patientAnswer}
                  </p>
                  <p className="mt-2 text-[10px] text-slate-400">
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        }
      />
    </div>
  );
}
