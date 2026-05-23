"use client";

import { useApp } from "@/context/AppContext";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { PHYSICIAN_PHONES } from "@/lib/physicianPhones";
import { PhysicianPhoneSimulator } from "@/components/phone/PhysicianPhoneSimulator";

export function PhysicianPhonesPanel() {
  const { patient } = useApp();

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <p className="shrink-0 border-b border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
        Physician inboxes
      </p>
      <div className="flex min-h-0 flex-1 gap-1 overflow-x-auto p-1.5">
        {PHYSICIAN_PHONES.map((line) => (
          <div
            key={line.number}
            className="h-full min-w-[200px] flex-1 shrink-0"
          >
            <PhysicianPhoneSimulator
              phoneNumber={line.number}
              lineLabel={`${line.label} · ${formatPhoneDisplay(line.number)}`}
              patient={patient}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
