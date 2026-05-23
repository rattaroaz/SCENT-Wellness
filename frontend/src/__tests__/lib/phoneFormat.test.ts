import { describe, it, expect } from "vitest";
import { digitsOnly, formatPhoneDisplay, formatPhoneInput } from "@/lib/phoneFormat";

describe("phoneFormat", () => {
  it("digitsOnly extracts up to 10 digits", () => {
    expect(digitsOnly("(555) 123-4567")).toBe("5551234567");
    expect(digitsOnly("1-555-999-0000")).toBe("5559990000");
  });

  it("formatPhoneDisplay formats as xxx-xxx-xxxx", () => {
    expect(formatPhoneDisplay("5551234567")).toBe("555-123-4567");
    expect(formatPhoneDisplay("5551234")).toBe("555-123-4");
  });

  it("formatPhoneInput formats while typing", () => {
    expect(formatPhoneInput("5551234567")).toBe("555-123-4567");
  });
});
