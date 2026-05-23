import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  formatPhoneDisplay,
  formatPhoneInput,
} from "@/lib/phoneFormat";

describe("phoneFormat edge cases", () => {
  it("digitsOnly strips leading 1 for 11-digit US numbers", () => {
    expect(digitsOnly("1-555-123-4567")).toBe("5551234567");
    expect(digitsOnly("15551234567")).toBe("5551234567");
  });

  it("digitsOnly caps to 10 digits", () => {
    expect(digitsOnly("555-123-456789")).toBe("5551234567");
  });

  it("formatPhoneDisplay returns empty for empty input", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });

  it("formatPhoneDisplay handles partial inputs", () => {
    expect(formatPhoneDisplay("555")).toBe("555");
    expect(formatPhoneDisplay("5551")).toBe("555-1");
    expect(formatPhoneDisplay("555123")).toBe("555-123");
    expect(formatPhoneDisplay("5551234")).toBe("555-123-4");
  });

  it("formatPhoneInput alias matches formatPhoneDisplay", () => {
    expect(formatPhoneInput("5551234567")).toBe("555-123-4567");
  });
});
