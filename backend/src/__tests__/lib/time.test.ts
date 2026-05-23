import { describe, it, expect } from "vitest";
import { computeSendAt } from "../../lib/time";

describe("computeSendAt", () => {
  it("adds weeks, days, hours, minutes, seconds to a base date", () => {
    const base = new Date("2025-01-01T00:00:00Z");
    const result = computeSendAt(base, 1, 2, 3, 4, 5);
    expect(result.getTime()).toBeGreaterThan(base.getTime());
  });
});
