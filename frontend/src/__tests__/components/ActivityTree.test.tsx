import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityTree } from "@/components/ActivityTree";
import type { ActivityTreePatient } from "@/lib/types";

const patients: ActivityTreePatient[] = [
  {
    id: "p1",
    lastName: "Doe",
    firstName: "Jane",
    dateOfBirth: "1990-01-01",
    mrn: "MRN1",
    cellPhone: "5555550001",
    campaigns: [
      {
        id: "c1",
        physicianPhone: "5555555550",
        status: "ACTIVE",
        startedAt: new Date().toISOString(),
        template: { id: "t1", name: "Shoulder" },
        scheduled: [
          {
            id: "m1",
            sendAt: new Date(Date.now() + 60_000).toISOString(),
            sentAt: null,
            status: "PENDING",
            body: "Welcome message",
          },
        ],
      },
    ],
  },
];

beforeEach(() => {
  localStorage.clear();
});

describe("ActivityTree", () => {
  it("renders patient → campaign → message hierarchy", () => {
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    expect(screen.getByText("Doe, Jane")).toBeInTheDocument();
    expect(screen.getByText("Shoulder")).toBeInTheDocument();
    expect(screen.getByText("Welcome message")).toBeInTheDocument();
  });

  it("shows empty label when no patients", () => {
    render(
      <ActivityTree
        patients={[]}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
        emptyLabel="Nothing here"
      />
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("toggles a patient branch via chevron click", async () => {
    const user = userEvent.setup();
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    expect(screen.getByText("Shoulder")).toBeInTheDocument();
    const chevron = screen.getByRole("button", { name: /Hide Doe, Jane campaigns/i });
    await user.click(chevron);
    expect(screen.queryByText("Shoulder")).not.toBeInTheDocument();
  });

  it("Collapse all hides all branches", async () => {
    const user = userEvent.setup();
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: /Collapse all/i }));
    expect(screen.queryByText("Shoulder")).not.toBeInTheDocument();
  });

  it("Expand all restores branches", async () => {
    const user = userEvent.setup();
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: /Collapse all/i }));
    await user.click(screen.getByRole("button", { name: /Expand all/i }));
    expect(screen.getByText("Shoulder")).toBeInTheDocument();
    expect(screen.getByText("Welcome message")).toBeInTheDocument();
  });

  it("fires onSelectPatient when patient row clicked", async () => {
    const user = userEvent.setup();
    const onSelectPatient = vi.fn();
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={onSelectPatient}
        onSelectCampaign={() => {}}
      />
    );
    await user.click(screen.getByText("Doe, Jane"));
    expect(onSelectPatient).toHaveBeenCalledWith(patients[0]);
  });

  it("fires onSelectCampaign when campaign row clicked", async () => {
    const user = userEvent.setup();
    const onSelectCampaign = vi.fn();
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={onSelectCampaign}
      />
    );
    await user.click(screen.getByText("Shoulder"));
    expect(onSelectCampaign).toHaveBeenCalled();
  });

  it("shows delete button only when canManage", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
        onDeletePatient={onDelete}
        canManage
      />
    );
    const del = screen.getByTitle("Delete patient");
    await user.click(del);
    expect(onDelete).toHaveBeenCalledWith("p1");
    confirmSpy.mockRestore();
  });

  it("does not show delete button when canManage is false", () => {
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
        onDeletePatient={() => {}}
      />
    );
    expect(screen.queryByTitle("Delete patient")).not.toBeInTheDocument();
  });

  it("highlights selected campaign", () => {
    const { container } = render(
      <ActivityTree
        patients={patients}
        selectedPatientId="p1"
        selectedCampaignId="c1"
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    const selected = container.querySelector(".bg-brand-100");
    expect(selected).toBeTruthy();
  });

  it("uses inline label when a patient has no campaigns", () => {
    render(
      <ActivityTree
        patients={[{ ...patients[0], campaigns: [] }]}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    expect(screen.getByText(/No active campaigns/i)).toBeInTheDocument();
  });

  it("active count badge reflects number of campaigns", () => {
    render(
      <ActivityTree
        patients={patients}
        selectedPatientId={null}
        selectedCampaignId={null}
        onSelectPatient={() => {}}
        onSelectCampaign={() => {}}
      />
    );
    const row = screen.getByText("Doe, Jane").closest("button");
    expect(within(row as HTMLElement).getByText(/1 active/i)).toBeInTheDocument();
  });
});
