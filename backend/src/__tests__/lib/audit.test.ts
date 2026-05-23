import { describe, it, expect } from "vitest";
import { recordAudit } from "../../lib/audit";
import { prisma } from "../../lib/prisma";
import { createTestUser } from "../../test/helpers";
import { Role } from "@prisma/client";

describe("audit", () => {
  it("recordAudit persists audit events", async () => {
    const user = await createTestUser(Role.ADMIN);

    await recordAudit({
      userId: user.id,
      action: "patient.read",
      resource: "patient",
      resourceId: "patient-123",
      metadata: { resultCount: 1 },
    });

    const row = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: "patient.read" },
    });

    expect(row).toBeTruthy();
    expect(row?.resource).toBe("patient");
    expect(row?.resourceId).toBe("patient-123");
    expect(JSON.parse(row!.metadata!)).toEqual({ resultCount: 1 });
  });

  it("recordAudit works without userId for failed login", async () => {
    await recordAudit({
      action: "auth.login_failed",
      resource: "auth",
      metadata: { username: "unknown" },
    });

    const row = await prisma.auditLog.findFirst({
      where: { action: "auth.login_failed" },
    });
    expect(row?.userId).toBeNull();
  });
});
