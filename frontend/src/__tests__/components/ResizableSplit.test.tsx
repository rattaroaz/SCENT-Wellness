import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResizableSplit } from "@/components/resize/ResizableSplit";

beforeEach(() => {
  localStorage.clear();
});

describe("ResizableSplit", () => {
  it("renders first and second children", () => {
    render(
      <ResizableSplit
        direction="horizontal"
        initialSize={100}
        minSize={50}
        maxSize={500}
        first={<div data-testid="left">L</div>}
        second={<div data-testid="right">R</div>}
      />
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("exposes a separator with the requested orientation", () => {
    render(
      <ResizableSplit
        direction="vertical"
        initialSize={100}
        minSize={50}
        maxSize={500}
        first={<div>A</div>}
        second={<div>B</div>}
      />
    );
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("starting a drag sets the body cursor", async () => {
    const user = userEvent.setup();
    render(
      <ResizableSplit
        direction="horizontal"
        initialSize={100}
        minSize={50}
        maxSize={500}
        first={<div>A</div>}
        second={<div>B</div>}
      />
    );
    const sep = screen.getByRole("separator");
    await user.pointer({ keys: "[MouseLeft>]", target: sep });
    expect(document.body.style.cursor).toBe("col-resize");
    await user.pointer({ keys: "[/MouseLeft]" });
  });
});
