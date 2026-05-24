import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientPhoneSimulator } from "@/components/PatientPhoneSimulator";
import { api } from "@/lib/api";

const refreshSms = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useApp: () => ({
    patientSms: [
      {
        id: "out-1",
        direction: "OUTBOUND" as const,
        fromNumber: "SCENT",
        toNumber: "5555551234",
        body: "How are you?",
        questionMessage: "How are you?",
        expectsResponse: true,
        createdAt: new Date().toISOString(),
      },
    ],
    refreshSms,
  }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

vi.mock("@/components/phone/PhoneShell", () => ({
  PhoneShell: ({
    messages,
    onSelectReplyTarget,
    compose,
  }: {
    messages: Array<{ id: string; body: string; canSelectAsReplyTarget?: boolean }>;
    onSelectReplyTarget?: (id: string) => void;
    compose: ReactNode;
  }) => (
    <div>
      {messages.map((m) => (
        <button
          key={m.id}
          type="button"
          disabled={!m.canSelectAsReplyTarget}
          onClick={() => onSelectReplyTarget?.(m.id)}
        >
          {m.body}
        </button>
      ))}
      {compose}
    </div>
  ),
}));

const patient = {
  id: "p1",
  firstName: "Jane",
  lastName: "Doe",
  dateOfBirth: "1990-01-01",
  mrn: "MRN1",
  cellPhone: "5555551234",
};

describe("PatientPhoneSimulator", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    refreshSms.mockReset().mockResolvedValue(undefined);
  });

  it("disables send until a reply target is selected", () => {
    render(<PatientPhoneSimulator patient={patient} />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
    expect(api).not.toHaveBeenCalled();
  });

  it("sends reply with outboundLogId when target selected", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValueOnce({ ok: true });
    render(<PatientPhoneSimulator patient={patient} />);

    await user.click(screen.getByRole("button", { name: "How are you?" }));
    await user.type(screen.getByPlaceholderText(/Your reply/i), "Feeling fine");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(api).toHaveBeenCalledWith(
      "/sms/simulate/reply",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("out-1"),
      })
    );
    expect(refreshSms).toHaveBeenCalled();
  });
});
