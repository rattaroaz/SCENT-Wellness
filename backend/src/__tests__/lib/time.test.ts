import { describe, it, expect } from "vitest";
import { offsetToMilliseconds, computeSendAt } from "../../lib/time";

describe("time utilities", () => {
  it("offsetToMilliseconds converts weeks/days/hours/minutes/seconds correctly", () => {
    expect(offsetToMilliseconds(0, 0, 0, 0, 30)).toBe(30 * 1000);
    expect(offsetToMilliseconds(0, 0, 0, 5, 0)).toBe(5 * 60 * 1000);
    expect(offsetToMilliseconds(0, 0, 2, 0, 0)).toBe(2 * 60 * 60 * 1000);
    expect(offsetToMilliseconds(0, 1, 0, 0, 0)).toBe(24 * 60 * 60 * 1000);
    expect(offsetToMilliseconds(1, 0, 0, 0, 0)).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("computeSendAt adds offset to campaign start", () => {
    const start = new Date("2025-06-01T12:00:00Z");
    const sendAt = computeSendAt(start, 0, 0, 0, 1, 0);
    expect(sendAt.getTime() - start.getTime()).toBe(60 * 1000);
  });
});
