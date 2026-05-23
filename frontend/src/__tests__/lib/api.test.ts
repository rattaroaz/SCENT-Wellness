import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, setToken } from "@/lib/api";

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      })
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends Authorization header when token is set", async () => {
    setToken("test-token");
    await api("/auth/me");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("throws on error responses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Invalid token" }),
    } as Response);

    await expect(api("/protected")).rejects.toThrow("Invalid token");
  });
});
