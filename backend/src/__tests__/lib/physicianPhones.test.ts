import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  phonesMatch,
  formatPhysicianSmsBody,
  DEFAULT_PHYSICIAN_PHONE,
} from "../../lib/physicianPhones";

describe("physicianPhones", () => {
  it("normalizePhone strips non-digits", () => {
    expect(normalizePhone("555-123-4567")).toBe("5551234567");
    expect(normalizePhone("(555) 555-5550")).toBe("5555555550");
  });

  it("phonesMatch compares normalized numbers", () => {
    expect(phonesMatch("555-555-5550", "5555555550")).toBe(true);
    expect(phonesMatch("5555555550", "5555555551")).toBe(false);
  });

  it("formatPhysicianSmsBody includes patient and Q/A", () => {
    const body = formatPhysicianSmsBody({
      lastName: "Doe",
      firstName: "Jane",
      dateOfBirth: "1990-01-01",
      mrn: "MRN123",
      questionMessage: "How are you?",
      patientAnswer: "Fine",
    });
    expect(body).toContain("Doe, Jane");
    expect(body).toContain("Q: How are you?");
    expect(body).toContain("A: Fine");
  });

  it("DEFAULT_PHYSICIAN_PHONE is set", () => {
    expect(DEFAULT_PHYSICIAN_PHONE).toBe("5555555550");
  });
});
