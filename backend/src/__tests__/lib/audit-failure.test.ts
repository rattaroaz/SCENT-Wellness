import { describe, it, expect, vi } from "vitest";
import { recordAudit } from "../../lib/audit";
import { prisma } from "../../lib/prisma";

describe("audit failure path", () => {
  it("swallows DB errors so failures never break the request flow", async () => {
    const spy = vi
      .spyOn(prisma.auditLog, "create")
      .mockRejectedValueOnce(new Error("simulated db error"));

    await expect(
      recordAudit({
        action: "patient.read",
        resource: "patient",
        metadata: { sample: true },
      })
    ).resolves.toBeUndefined();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("merges reqId into metadata when provided", async () => {
    const spy = vi.spyOn(prisma.auditLog, "create");

    await recordAudit({
      action: "patient.read",
      resource: "patient",
      reqId: "req-xyz-1",
      metadata: { foo: "bar" },
    });

    const arg = spy.mock.calls[spy.mock.calls.length - 1][0] as {
      data: { metadata: string };
    };
    expect(JSON.parse(arg.data.metadata)).toMatchObject({
      foo: "bar",
      reqId: "req-xyz-1",
    });
    spy.mockRestore();
  });
});
