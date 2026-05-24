import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SmsSimulator } from "@/components/SmsSimulator";
import { api } from "@/lib/api";

const refreshSms = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useApp: () => ({
    patient: {
      id: "p1",
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1990-01-01",
      mrn: "MRN1",
      cellPhone: "5555550001",
    },
    refreshSms,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/components/PatientPhoneSimulator", () => ({
  PatientPhoneSimulator: () => <div data-testid="patient-phone" />,
}));

vi.mock("@/components/phone/PhysicianPhonesPanel", () => ({
  PhysicianPhonesPanel: () => <div data-testid="physician-phones" />,
}));

vi.mock("@/components/resize/ResizableSplit", () => ({
  ResizableSplit: ({
    first,
    second,
  }: {
    first: ReactNode;
    second: ReactNode;
  }) => (
    <div>
      {first}
      {second}
    </div>
  ),
}));

describe("SmsSimulator", () => {
  beforeEach(() => {
    vi.mocked(api).mockResolvedValue({ ok: true, logs: 2, forwards: 1 });
    refreshSms.mockResolvedValue(undefined);
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears all simulator messages and refreshes inboxes", async () => {
    const user = userEvent.setup();
    render(<SmsSimulator />);

    await user.click(screen.getByRole("button", { name: /Clear all messages/i }));

    expect(confirm).toHaveBeenCalledWith(
      "Clear all messages on every simulated phone (patient and physician)? This cannot be undone."
    );
    expect(api).toHaveBeenCalledWith("/sms/simulate/clear", { method: "POST" });
    await waitFor(() => expect(refreshSms).toHaveBeenCalled());
  });

  it("does not call the API when clear is cancelled", async () => {
    vi.mocked(confirm).mockReturnValue(false);
    const user = userEvent.setup();
    render(<SmsSimulator />);

    await user.click(screen.getByRole("button", { name: /Clear all messages/i }));

    expect(api).not.toHaveBeenCalled();
    expect(refreshSms).not.toHaveBeenCalled();
  });

  it("shows an inline error when clearing fails", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("Clear failed"));
    const user = userEvent.setup();
    render(<SmsSimulator />);

    await user.click(screen.getByRole("button", { name: /Clear all messages/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Clear failed");
    });
    expect(refreshSms).not.toHaveBeenCalled();
  });
});
