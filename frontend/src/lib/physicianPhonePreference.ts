import { formatPhoneDisplay } from "@/lib/phoneFormat";
import {
  DEFAULT_PHYSICIAN_PHONE,
  normalizePhone,
  PHYSICIAN_PHONE_STORAGE_KEY,
} from "@/lib/physicianPhones";

export function loadPhysicianPhonePreference(): string {
  if (typeof window === "undefined") {
    return formatPhoneDisplay(DEFAULT_PHYSICIAN_PHONE);
  }
  const stored = localStorage.getItem(PHYSICIAN_PHONE_STORAGE_KEY);
  if (!stored) return formatPhoneDisplay(DEFAULT_PHYSICIAN_PHONE);
  const normalized = normalizePhone(stored);
  return normalized.length >= 7
    ? formatPhoneDisplay(normalized)
    : formatPhoneDisplay(DEFAULT_PHYSICIAN_PHONE);
}

export function savePhysicianPhonePreference(phone: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PHYSICIAN_PHONE_STORAGE_KEY, normalizePhone(phone));
}
