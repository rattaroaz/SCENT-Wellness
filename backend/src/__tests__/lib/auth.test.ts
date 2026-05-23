import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  getUser,
  requireAuth,
  canEditTemplates,
  canManagePatients,
} from "../../lib/auth";

type FakeReq = { user?: { id: string; username: string; role: Role } };

describe("auth helpers", () => {
  it("getUser returns null when no user attached", () => {
    expect(getUser({} as never)).toBeNull();
  });

  it("getUser returns user when attached", () => {
    const req: FakeReq = { user: { id: "u1", username: "x", role: Role.USER } };
    expect(getUser(req as never)?.id).toBe("u1");
  });

  it("requireAuth throws 401-tagged error when missing", () => {
    try {
      requireAuth({} as never);
      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error & { statusCode?: number }).statusCode).toBe(401);
    }
  });

  it("requireAuth returns user when present", () => {
    const req: FakeReq = { user: { id: "u1", username: "x", role: Role.ADMIN } };
    expect(requireAuth(req as never).role).toBe(Role.ADMIN);
  });

  it("canEditTemplates true for ADMIN/USER, false for GUEST", () => {
    expect(canEditTemplates(Role.ADMIN)).toBe(true);
    expect(canEditTemplates(Role.USER)).toBe(true);
    expect(canEditTemplates(Role.GUEST)).toBe(false);
  });

  it("canManagePatients true for ADMIN/USER, false for GUEST", () => {
    expect(canManagePatients(Role.ADMIN)).toBe(true);
    expect(canManagePatients(Role.USER)).toBe(true);
    expect(canManagePatients(Role.GUEST)).toBe(false);
  });
});
