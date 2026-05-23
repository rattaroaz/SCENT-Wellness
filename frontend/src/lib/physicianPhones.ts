export const DEFAULT_PHYSICIAN_PHONE = "5555555550";
export const PHYSICIAN_PHONE_STORAGE_KEY = "scent-physician-phone";

export const PHYSICIAN_PHONES = [
  { number: "5555555550", label: "Line 1" },
  { number: "5555555551", label: "Line 2" },
  { number: "5555555553", label: "Line 3" },
] as const;

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
