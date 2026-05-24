import { describe, it, expect } from "vitest";
import { DEFAULT_NO_REPLY_MESSAGE } from "@/lib/smsDefaults";

describe("smsDefaults", () => {
  it("exports a non-empty default no-reply message", () => {
    expect(DEFAULT_NO_REPLY_MESSAGE.length).toBeGreaterThan(10);
    expect(DEFAULT_NO_REPLY_MESSAGE).toMatch(/does not accept replies/i);
  });
});
