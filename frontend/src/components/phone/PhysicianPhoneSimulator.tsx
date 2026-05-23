"use client";

import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { PhoneShell, type PhoneThreadMessage } from "@/components/phone/PhoneShell";
import { formatPhysicianSmsBody, phonesMatch } from "@/lib/physicianPhones";
import type { Patient } from "@/lib/types";

type PhysicianPhoneSimulatorProps = {
  phoneNumber: string;
  lineLabel: string;
  patient: Patient | null;
  compact?: boolean;
};

export function PhysicianPhoneSimulator({
  phoneNumber,
  lineLabel,
  patient,
  compact = true,
}: PhysicianPhoneSimulatorProps) {
  const { physicianInbox } = useApp();

  const messages: PhoneThreadMessage[] = useMemo(() => {
    return physicianInbox
      .filter((e) => phonesMatch(e.physicianPhone, phoneNumber))
      .map((e) => ({
        id: e.id,
        body: formatPhysicianSmsBody(e),
        createdAt: e.createdAt,
        received: true,
      }));
  }, [physicianInbox, phoneNumber]);

  const contactName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Patient";

  return (
    <PhoneShell
      compact={compact}
      phoneNumber={phoneNumber}
      contactName={contactName}
      contactSubtitle={lineLabel}
      avatarLabel={lineLabel.replace(/\D/g, "").slice(-2) || "MD"}
      messages={messages}
      emptyHint="Patient replies forwarded here will appear in this thread."
    />
  );
}
