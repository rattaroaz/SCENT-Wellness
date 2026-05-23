import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SideNav } from "@/components/SideNav";

const setNav = vi.fn();
const logout = vi.fn();
const ctx = {
  nav: "patient" as const,
  setNav,
  user: { id: "u1", username: "alice", role: "ADMIN" as const },
  logout,
};

vi.mock("@/context/AppContext", () => ({
  useApp: () => ctx,
}));

describe("SideNav", () => {
  beforeEach(() => {
    setNav.mockReset();
    logout.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nav items in Patient → Messages → Templates → Threads order", () => {
    render(<SideNav />);
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => ["Patient", "Messages", "Templates", "Threads"].includes(b.textContent ?? ""));
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toEqual(["Patient", "Messages", "Templates", "Threads"]);
  });

  it("calls setNav when clicking an item", async () => {
    const user = userEvent.setup();
    render(<SideNav />);
    await user.click(screen.getByRole("button", { name: "Threads" }));
    expect(setNav).toHaveBeenCalledWith("threads");
  });

  it("renders user info and sign-out button", () => {
    render(<SideNav />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
  });
});
