import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppProvider, useApp } from "@/context/AppContext";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

function Probe() {
  const app = useApp();
  return (
    <div>
      <span data-testid="loading">{String(app.loading)}</span>
      <span data-testid="user">{app.user?.username ?? "none"}</span>
      <span data-testid="canEdit">{String(app.canEditTemplates)}</span>
      <span data-testid="canManage">{String(app.canManagePatients)}</span>
      <button
        type="button"
        onClick={() => app.login("admin", "password").catch(() => {})}
      >
        login
      </button>
      <button type="button" onClick={() => app.logout()}>
        logout
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppContext", () => {
  it("starts loading=true and resolves to no user when /auth/me 401s", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/auth/me"))
        return Promise.resolve(jsonResponse({ error: "Unauthorized" }, 401));
      return Promise.resolve(jsonResponse({}, 200));
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("loading")).toHaveTextContent("false")
    );
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("login() stores token, fills user, sets role-based capabilities", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/auth/me"))
        return Promise.resolve(jsonResponse({ error: "u" }, 401));
      if (url.endsWith("/auth/login"))
        return Promise.resolve(
          jsonResponse({
            token: "abc",
            user: { id: "u1", username: "admin", role: "ADMIN" },
          })
        );
      return Promise.resolve(jsonResponse({ patients: [], templates: [], threads: [], logs: [], entries: [], retentionDays: 30 }));
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() => screen.getByTestId("loading").textContent === "false");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("admin")
    );
    expect(localStorage.getItem("token")).toBe("abc");
    expect(screen.getByTestId("canEdit")).toHaveTextContent("true");
    expect(screen.getByTestId("canManage")).toHaveTextContent("true");
  });

  it("logout() clears the token and user", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/auth/me"))
        return Promise.resolve(jsonResponse({ error: "u" }, 401));
      if (url.endsWith("/auth/login"))
        return Promise.resolve(
          jsonResponse({
            token: "abc",
            user: { id: "u1", username: "admin", role: "ADMIN" },
          })
        );
      return Promise.resolve(
        jsonResponse({ patients: [], templates: [], threads: [], logs: [], entries: [], retentionDays: 30 })
      );
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    const user = userEvent.setup();
    await waitFor(() => screen.getByTestId("loading").textContent === "false");
    await user.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("admin")
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "logout" }));
    });
    expect(screen.getByTestId("user")).toHaveTextContent("none");
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("GUEST role disables canEditTemplates/canManagePatients", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/auth/me"))
        return Promise.resolve(
          jsonResponse({ user: { id: "u2", username: "g", role: "GUEST" } })
        );
      return Promise.resolve(
        jsonResponse({ patients: [], templates: [], threads: [], logs: [], entries: [], retentionDays: 30 })
      );
    });

    render(
      <AppProvider>
        <Probe />
      </AppProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("user")).toHaveTextContent("g")
    );
    expect(screen.getByTestId("canEdit")).toHaveTextContent("false");
    expect(screen.getByTestId("canManage")).toHaveTextContent("false");
  });
});
