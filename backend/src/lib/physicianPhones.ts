export const DEFAULT_PHYSICIAN_PHONE = "5555555550";

export const PHYSICIAN_PHONES = [
  "5555555550",
  "5555555551",
  "5555555553",
] as const;

export type PhysicianPhone = (typeof PHYSICIAN_PHONES)[number];

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function formatPhysicianSmsBody(entry: {
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  mrn: string;
  questionMessage: string;
  patientAnswer: string;
}): string {
  return [
    `${entry.lastName}, ${entry.firstName}`,
    `DOB: ${entry.dateOfBirth} | MRN: ${entry.mrn}`,
    "",
    `Q: ${entry.questionMessage}`,
    "",
    `A: ${entry.patientAnswer}`,
  ].join("\n");
}
