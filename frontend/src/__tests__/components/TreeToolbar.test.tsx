import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TreeToolbar } from "@/components/tree/TreeToolbar";

describe("TreeToolbar", () => {
  it("calls onExpandAll and onCollapseAll", async () => {
    const user = userEvent.setup();
    const expand = vi.fn();
    const collapse = vi.fn();
    render(<TreeToolbar onExpandAll={expand} onCollapseAll={collapse} />);
    await user.click(screen.getByRole("button", { name: /Expand all/i }));
    await user.click(screen.getByRole("button", { name: /Collapse all/i }));
    expect(expand).toHaveBeenCalledTimes(1);
    expect(collapse).toHaveBeenCalledTimes(1);
  });
});
