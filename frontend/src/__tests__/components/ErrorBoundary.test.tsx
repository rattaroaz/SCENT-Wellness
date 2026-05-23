import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function Bomb({ throwIt }: { throwIt: boolean }) {
  if (throwIt) throw new Error("kaboom");
  return <p>safe</p>;
}

describe("ErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Bomb throwIt={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("safe")).toBeInTheDocument();
  });

  it("renders default fallback with error message when child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb throwIt={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={(err) => <p>custom: {err.message}</p>}>
        <Bomb throwIt={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom: kaboom")).toBeInTheDocument();
  });

  it("Try again button resets the boundary so safe children render", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    function Conditional() {
      return <Bomb throwIt={shouldThrow} />;
    }
    const { rerender } = render(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    shouldThrow = false;
    await user.click(screen.getByRole("button", { name: /Try again/i }));
    rerender(
      <ErrorBoundary>
        <Conditional />
      </ErrorBoundary>
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("safe")).toBeInTheDocument();
  });
});
