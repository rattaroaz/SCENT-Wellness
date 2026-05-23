import { describe, it, expect } from "vitest";
import {
  DEFAULT_PHYSICIAN_PHONE,
  PHYSICIAN_PHONES,
  PHYSICIAN_PHONE_STORAGE_KEY,
  formatPhysicianSmsBody,
  normalizePhone,
  phonesMatch,
} from "@/lib/physicianPhones";

describe("physicianPhones (frontend)", () => {
  it("default + storage key constants are stable", () => {
    expect(DEFAULT_PHYSICIAN_PHONE).toBe("5555555550");
    expect(PHYSICIAN_PHONE_STORAGE_KEY).toBe("scent-physician-phone");
    expect(PHYSICIAN_PHONES.length).toBeGreaterThanOrEqual(2);
  });

  it("normalizePhone strips non-digits", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("5551234567");
  });

  it("phonesMatch handles formatted vs digits-only", () => {
    expect(phonesMatch("(555) 555-5550", "5555555550")).toBe(true);
    expect(phonesMatch("5555555550", "5555555551")).toBe(false);
  });

  it("formatPhysicianSmsBody renders Q/A block", () => {
    const body = formatPhysicianSmsBody({
      lastName: "Doe",
      firstName: "Jane",
      dateOfBirth: "1990-01-01",
      mrn: "MRN1",
      questionMessage: "How are you?",
      patientAnswer: "Great",
    });
    expect(body).toContain("Doe, Jane");
    expect(body).toContain("DOB: 1990-01-01 | MRN: MRN1");
    expect(body).toContain("Q: How are you?");
    expect(body).toContain("A: Great");
  });
});
