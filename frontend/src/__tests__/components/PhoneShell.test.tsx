import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneShell, type PhoneThreadMessage } from "@/components/phone/PhoneShell";

const baseMessages: PhoneThreadMessage[] = [
  {
    id: "o1",
    body: "Clinic question",
    createdAt: "2026-05-24T12:00:00.000Z",
    received: true,
    canSelectAsReplyTarget: true,
    isReplyTarget: true,
  },
  {
    id: "i1",
    body: "Patient answer",
    createdAt: "2026-05-24T12:01:00.000Z",
    received: false,
  },
];

describe("PhoneShell", () => {
  it("does not force-scroll when messages update", () => {
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });

    const { rerender } = render(
      <PhoneShell
        phoneNumber="5555555550"
        contactName="SCENT"
        avatarLabel="SW"
        messages={baseMessages}
        emptyHint="No messages"
      />
    );

    rerender(
      <PhoneShell
        phoneNumber="5555555550"
        contactName="SCENT"
        avatarLabel="SW"
        messages={[
          ...baseMessages,
          {
            id: "o2",
            body: "Another clinic message",
            createdAt: "2026-05-24T12:02:00.000Z",
            received: true,
          },
        ]}
        emptyHint="No messages"
      />
    );

    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("lets users choose a reply target only for unanswered clinic bubbles", async () => {
    const user = userEvent.setup();
    const onSelectReplyTarget = vi.fn();

    render(
      <PhoneShell
        phoneNumber="5555555550"
        contactName="SCENT"
        avatarLabel="SW"
        messages={[
          ...baseMessages,
          {
            id: "o2",
            body: "Already answered",
            createdAt: "2026-05-24T12:02:00.000Z",
            received: true,
            isAnswered: true,
          },
        ]}
        emptyHint="No messages"
        onSelectReplyTarget={onSelectReplyTarget}
      />
    );

    await user.click(screen.getByRole("button", { name: /Reply to: Clinic question/i }));

    expect(onSelectReplyTarget).toHaveBeenCalledWith("o1");
    expect(screen.getByText("Replied")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reply to: Already answered/i })
    ).not.toBeInTheDocument();
  });
});
