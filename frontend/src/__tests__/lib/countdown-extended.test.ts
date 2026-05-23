import { describe, it, expect } from "vitest";
import { formatCountdown } from "@/lib/countdown";

describe("formatCountdown edge cases", () => {
  it("returns 'Sending now…' for zero or negative", () => {
    expect(formatCountdown(0)).toBe("Sending now…");
    expect(formatCountdown(-1)).toBe("Sending now…");
  });

  it("formats seconds", () => {
    expect(formatCountdown(45_000)).toBe("45s");
  });

  it("formats minutes + seconds", () => {
    expect(formatCountdown(125_000)).toBe("2m 5s");
  });

  it("formats hours + minutes + seconds", () => {
    expect(formatCountdown((2 * 3600 + 5 * 60 + 7) * 1000)).toBe("2h 5m 7s");
  });

  it("formats days + hours, omits zero minutes", () => {
    expect(formatCountdown(2 * 86_400_000 + 3 * 3_600_000)).toBe("2d 3h 0s");
  });

  it("formats weeks at the top", () => {
    expect(formatCountdown(2 * 7 * 86_400_000)).toBe("2w 0s");
  });
});
