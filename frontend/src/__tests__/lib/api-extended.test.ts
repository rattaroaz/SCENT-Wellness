import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, setToken } from "@/lib/api";

describe("api – error & network handling", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not include Authorization header when no token set", async () => {
    const f = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", f);

    await api("/health");

    const headers = (f.mock.calls[0][1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBeUndefined();
  });

  it("wraps zod-style object errors with a friendly message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: { fieldErrors: { name: ["Required"] } } }),
      })
    );

    await expect(api("/templates", { method: "POST" })).rejects.toThrow(
      /Validation failed/
    );
  });

  it("returns a friendly error on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"))
    );

    await expect(api("/anything")).rejects.toThrow(/Cannot reach the API/);
  });

  it("setToken(null) clears stored token", () => {
    setToken("abc");
    expect(localStorage.getItem("token")).toBe("abc");
    setToken(null);
    expect(localStorage.getItem("token")).toBeNull();
  });
});
