import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreeExpansion } from "@/hooks/useTreeExpansion";

describe("useTreeExpansion", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to all keys expanded", () => {
    const { result } = renderHook(() =>
      useTreeExpansion(["a", "b", "c"])
    );
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(true);
    expect(result.current.isExpanded("c")).toBe(true);
  });

  it("defaultExpanded:false starts collapsed", () => {
    const { result } = renderHook(() =>
      useTreeExpansion(["a"], { defaultExpanded: false })
    );
    expect(result.current.isExpanded("a")).toBe(false);
  });

  it("toggle flips state for a key", () => {
    const { result } = renderHook(() => useTreeExpansion(["a"]));
    act(() => result.current.toggle("a"));
    expect(result.current.isExpanded("a")).toBe(false);
    act(() => result.current.toggle("a"));
    expect(result.current.isExpanded("a")).toBe(true);
  });

  it("expandAll and collapseAll work", () => {
    const { result } = renderHook(() =>
      useTreeExpansion(["a", "b"], { defaultExpanded: false })
    );
    act(() => result.current.expandAll());
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(true);
    act(() => result.current.collapseAll());
    expect(result.current.isExpanded("a")).toBe(false);
    expect(result.current.isExpanded("b")).toBe(false);
  });

  it("persists state to localStorage when storageKey provided", () => {
    const { result } = renderHook(() =>
      useTreeExpansion(["a", "b"], { storageKey: "test-tree" })
    );
    act(() => result.current.toggle("a"));
    const stored = JSON.parse(localStorage.getItem("test-tree") ?? "[]");
    expect(stored).toEqual(["b"]);
  });

  it("restores state from localStorage on mount", () => {
    localStorage.setItem("test-tree", JSON.stringify(["b"]));
    const { result } = renderHook(() =>
      useTreeExpansion(["a", "b", "c"], { storageKey: "test-tree" })
    );
    expect(result.current.isExpanded("a")).toBe(false);
    expect(result.current.isExpanded("b")).toBe(true);
    expect(result.current.isExpanded("c")).toBe(false);
  });
});
