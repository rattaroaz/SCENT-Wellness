import { describe, it, expect } from "vitest";
import { formatCountdown } from "@/lib/countdown";

describe("formatCountdown", () => {
  it("returns 'Sending now…' for <= 0", () => {
    expect(formatCountdown(0)).toBe("Sending now…");
    expect(formatCountdown(-1000)).toBe("Sending now…");
  });

  it("formats weeks, days, hours, minutes, seconds", () => {
    expect(formatCountdown(2 * 24 * 60 * 60 * 1000)).toContain("2d");
    expect(formatCountdown(90 * 1000)).toContain("1m");
  });
});
