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
          "x-request-id": expect.any(String),
        }),
      })
    );
  });

  it("sends empty JSON object for POST without an explicit body", async () => {
    setToken("test-token");
    await api("/sms/simulate/clear", { method: "POST" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/sms/simulate/clear"),
      expect.objectContaining({
        method: "POST",
        body: "{}",
      })
    );
  });

  it("throws the error string from the response body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: "Invalid token" }),
    } as Response);

    await expect(api("/protected")).rejects.toThrow("Invalid token");
  });

  it("treats 401 as session expired and clears the token", async () => {
    setToken("expired-token");
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Invalid token" }),
    } as Response);

    await expect(api("/protected")).rejects.toThrow("Session expired");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("preserves login error message on 401 from /auth/login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ error: "Invalid username or password" }),
    } as Response);

    await expect(
      api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "x", password: "y" }),
      })
    ).rejects.toThrow("Invalid username or password");
  });
});
