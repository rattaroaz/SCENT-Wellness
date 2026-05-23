import { describe, it, expect } from "vitest";
import {
  PATIENT_RETENTION_DAYS,
  retentionCutoffDate,
} from "../../lib/patientRetention";

describe("patientRetention", () => {
  it("retentionCutoffDate is PATIENT_RETENTION_DAYS ago", () => {
    const cutoff = retentionCutoffDate();
    const expected = new Date(
      Date.now() - PATIENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(2000);
  });
});
