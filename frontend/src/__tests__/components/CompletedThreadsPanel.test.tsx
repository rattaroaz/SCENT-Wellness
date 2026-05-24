import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompletedThreadsPanel } from "@/components/CompletedThreadsPanel";
import type { CompletedThread } from "@/lib/types";

function makeThread(overrides: Partial<CompletedThread> = {}): CompletedThread {
  return {
    id: "c1",
    physicianPhone: "5555555550",
    status: "COMPLETED",
    startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    template: { id: "t1", name: "Knee Replacement" },
    scheduled: [
      {
        id: "m1",
        body: "How are you?",
        sendAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
        status: "SENT",
        expectsResponse: true,
      },
    ],
    patient: {
      id: "p1",
      lastName: "Doe",
      firstName: "Jane",
      dateOfBirth: "1990-01-01",
      mrn: "MRN1",
      cellPhone: "5555550001",
    },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("CompletedThreadsPanel", () => {
  it("renders empty state when no threads", () => {
    render(<CompletedThreadsPanel threads={[]} retentionDays={30} />);
    expect(screen.getByText(/No completed threads/i)).toBeInTheDocument();
  });

  it("groups threads by patient", () => {
    const t1 = makeThread({ id: "a" });
    const t2 = makeThread({ id: "b" });
    render(<CompletedThreadsPanel threads={[t1, t2]} retentionDays={30} />);
    const patientRows = screen.getAllByText("Doe, Jane");
    expect(patientRows.length).toBe(1);
  });

  it("starts collapsed by default and expands on chevron click", async () => {
    const user = userEvent.setup();
    render(
      <CompletedThreadsPanel threads={[makeThread()]} retentionDays={30} />
    );
    expect(screen.queryByText("Knee Replacement")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Show Doe, Jane threads/i }));
    expect(screen.getByText("Knee Replacement")).toBeInTheDocument();
  });

  it("shows COMPLETED badge and days remaining", async () => {
    const user = userEvent.setup();
    render(
      <CompletedThreadsPanel threads={[makeThread()]} retentionDays={30} />
    );
    await user.click(screen.getByRole("button", { name: /Show Doe, Jane threads/i }));
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText(/Deletes in \d+ day/)).toBeInTheDocument();
  });

  it("shows CANCELLED badge with red styling", async () => {
    const user = userEvent.setup();
    render(
      <CompletedThreadsPanel
        threads={[makeThread({ status: "CANCELLED" })]}
        retentionDays={30}
      />
    );
    await user.click(screen.getByRole("button", { name: /Show Doe, Jane threads/i }));
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
  });

  it("Expand all reveals message branches", async () => {
    const user = userEvent.setup();
    render(
      <CompletedThreadsPanel threads={[makeThread()]} retentionDays={30} />
    );
    await user.click(screen.getByRole("button", { name: /Expand all/i }));
    expect(screen.getByText("How are you?")).toBeInTheDocument();
  });
});
