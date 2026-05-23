import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeChevron } from "@/components/tree/TreeChevron";

describe("TreeChevron", () => {
  it("renders nothing interactive when hasChildren=false", () => {
    render(
      <TreeChevron
        expanded={false}
        onToggle={() => {}}
        label="leaf"
        hasChildren={false}
      />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("aria-expanded reflects expanded state", () => {
    render(
      <TreeChevron
        expanded={true}
        onToggle={() => {}}
        label="x"
        hasChildren
      />
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("clicking the button calls onToggle and stops propagation", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const outer = vi.fn();
    render(
      <div onClick={outer}>
        <TreeChevron expanded={false} onToggle={onToggle} label="x" hasChildren />
      </div>
    );
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalled();
    expect(outer).not.toHaveBeenCalled();
  });
});
