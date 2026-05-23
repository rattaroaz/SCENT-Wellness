import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("React Testing Library smoke test", () => {
  it("renders a simple element", () => {
    render(<div data-testid="hello">Hello SCENT</div>);
    expect(screen.getByTestId("hello")).toHaveTextContent("Hello SCENT");
  });

  it("supports user-event style interactions (button click)", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    let clicked = false;
    render(
      <button onClick={() => { clicked = true; }}>Click me</button>
    );
    await user.click(screen.getByRole("button"));
    expect(clicked).toBe(true);
  });
});
