import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PatientPane } from "@/components/PatientPane";
import { api } from "@/lib/api";

const setPatient = vi.fn();
const setNav = vi.fn();
const refreshActivityTree = vi.fn();

vi.mock("@/context/AppContext", () => ({
  useApp: () => ({
    setPatient,
    setNav,
    refreshActivityTree,
    canManagePatients: true,
    deletePatient: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("PatientPane", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    setPatient.mockReset();
    setNav.mockReset();
    refreshActivityTree.mockReset().mockResolvedValue(undefined);
  });

  it("creates a patient and navigates to messages", async () => {
    const user = userEvent.setup();
    vi.mocked(api).mockResolvedValueOnce({
      patient: {
        id: "p-new",
        lastName: "Smith",
        firstName: "Alex",
        dateOfBirth: "1992-03-01",
        mrn: "MRN-NEW",
        cellPhone: "5555559999",
      },
    });

    render(<PatientPane />);

    const fields = screen.getAllByRole("textbox");
    await user.type(fields[0], "Smith");
    await user.type(fields[1], "Alex");
    await user.type(fields[2], "1992-03-01");
    await user.type(fields[3], "MRN-NEW");
    await user.type(screen.getByPlaceholderText("555-555-5555"), "5555559999");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(setPatient).toHaveBeenCalled();
      expect(setNav).toHaveBeenCalledWith("messages");
    });
  });

  it("searches patients when query is entered", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api).mockResolvedValue({
      patients: [
        {
          id: "p1",
          lastName: "Doe",
          firstName: "Jane",
          dateOfBirth: "1990-01-01",
          mrn: "MRN1",
          cellPhone: "5555550001",
        },
      ],
    });

    const user = userEvent.setup();
    render(<PatientPane />);

    await user.type(screen.getByPlaceholderText(/Name, MRN/i), "Doe");
    await vi.advanceTimersByTimeAsync(350);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.stringContaining("/patients?query=")
      );
    });

    vi.useRealTimers();
  });
});
