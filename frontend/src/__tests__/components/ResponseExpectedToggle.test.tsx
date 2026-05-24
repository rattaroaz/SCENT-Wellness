import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponseExpectedToggle } from "@/components/ResponseExpectedToggle";

describe("ResponseExpectedToggle", () => {
  it("renders checkbox role with aria-checked reflecting state", () => {
    const { rerender } = render(
      <ResponseExpectedToggle checked={true} onChange={() => {}} />
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");

    rerender(<ResponseExpectedToggle checked={false} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with inverted value on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ResponseExpectedToggle checked={true} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is disabled when readOnly or no onChange", () => {
    const { unmount } = render(<ResponseExpectedToggle checked={true} readOnly />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    unmount();

    render(<ResponseExpectedToggle checked={true} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("shows correct title based on checked state", () => {
    const { rerender } = render(
      <ResponseExpectedToggle checked={true} onChange={() => {}} />
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "title",
      "Patient can reply — uncheck to disable replies"
    );

    rerender(<ResponseExpectedToggle checked={false} onChange={() => {}} />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "title",
      "Patient cannot reply — check to allow replies"
    );
  });
});
