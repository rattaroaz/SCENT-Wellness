import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNow } from "@/hooks/useNow";

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates on an interval after mount", () => {
    const { result } = renderHook(() => useNow(1000));
    act(() => {});
    const first = result.current;
    expect(first).toBe(Date.parse("2026-05-24T12:00:00.000Z"));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(Date.parse("2026-05-24T12:00:01.000Z"));
  });

  it("clears interval on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNow(500));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
