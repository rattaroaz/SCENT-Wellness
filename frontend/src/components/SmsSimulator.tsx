"use client";

import { PatientPhoneSimulator } from "@/components/PatientPhoneSimulator";
import { PhysicianPhonesPanel } from "@/components/phone/PhysicianPhonesPanel";
import { ResizableSplit } from "@/components/resize/ResizableSplit";
import { useApp } from "@/context/AppContext";

export function SmsSimulator() {
  const { patient } = useApp();

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-slate-200 bg-slate-100">
      <p className="shrink-0 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        SMS Simulator
      </p>
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
