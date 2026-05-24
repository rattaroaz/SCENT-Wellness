import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessagesPane } from "@/components/MessagesPane";
import { api } from "@/lib/api";

const mockUseApp = vi.fn();
vi.mock("@/context/AppContext", () => ({
  useApp: () => mockUseApp(),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/components/ResponseExpectedToggle", () => ({
  ResponseExpectedToggle: ({ checked, onChange }: { checked: boolean; onChange?: (v: boolean) => void }) => (
    <button
      data-testid="toggle"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
    />
  ),
}));

describe("MessagesPane", () => {
  const refreshSms = vi.fn();
  const refreshActivityTree = vi.fn();
  const refreshCompletedThreads = vi.fn();
  const setCampaign = vi.fn();
  const setNav = vi.fn();

  beforeEach(() => {
    vi.mocked(api).mockReset();
    refreshSms.mockReset().mockResolvedValue(undefined);
    refreshActivityTree.mockReset().mockResolvedValue(undefined);
    refreshCompletedThreads.mockReset().mockResolvedValue(undefined);
    setCampaign.mockReset();
    setNav.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  function setup(overrides: Partial<Parameters<typeof mockUseApp>[0]> = {}) {
    mockUseApp.mockReturnValue({
      patient: {
        id: "p1",
        firstName: "Jane",
        lastName: "Doe",
        dateOfBirth: "1990-01-01",
        mrn: "MRN1",
        cellPhone: "5555550001",
      },
      templates: [
        { id: "t1", name: "Knee", messages: [{ body: "Hello", weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 5 }] },
      ],
      campaign: null,
      setCampaign,
      refreshSms,
      refreshActivityTree,
      refreshCompletedThreads,
      setNav,
      ...overrides,
    });
  }

  it("shows error when starting without template selected", async () => {
    const user = userEvent.setup();
    setup();

    render(<MessagesPane />);

    await user.click(screen.getByRole("button", { name: /Start campaign/i }));

    expect(screen.getByText("Select a procedure template")).toBeInTheDocument();
  });

  function getTemplateSelect(container: HTMLElement): HTMLSelectElement {
    const select = container.querySelector("select");
    if (!select) throw new Error("Procedure template <select> not rendered");
    return select as HTMLSelectElement;
  }

  it("starts a campaign and navigates to threads on success", async () => {
    const user = userEvent.setup();
    setup();
    vi.mocked(api).mockResolvedValueOnce({
      campaign: { id: "c1", status: "ACTIVE", physicianPhone: "5555555550", startedAt: new Date().toISOString(), template: { id: "t1", name: "Knee" }, scheduled: [] },
      alreadyActive: false,
    });

    const { container } = render(<MessagesPane />);

    await user.selectOptions(getTemplateSelect(container), "t1");
    await user.click(screen.getByRole("button", { name: /Start campaign/i }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/campaigns", expect.objectContaining({ method: "POST" }));
    });
    await waitFor(() => expect(setNav).toHaveBeenCalledWith("threads"));
    expect(setCampaign).toHaveBeenCalled();
  });

  it("shows validation error for invalid physician phone", async () => {
    const user = userEvent.setup();
    setup();

    const { container } = render(<MessagesPane />);

    await user.selectOptions(getTemplateSelect(container), "t1");
    const phoneInput = screen.getByPlaceholderText(/555-555-5550/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "12");
    await user.click(screen.getByRole("button", { name: /Start campaign/i }));

    expect(screen.getByText(/Enter a valid physician SMS number/)).toBeInTheDocument();
  });
});
