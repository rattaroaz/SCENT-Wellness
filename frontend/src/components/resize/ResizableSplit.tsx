"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Direction = "horizontal" | "vertical";

type ResizableSplitProps = {
  direction: Direction;
  /** Size of the first panel in pixels */
  initialSize: number;
  minSize: number;
  maxSize: number;
  /** Minimum pixels reserved for the second panel */
  minSecondary?: number;
  storageKey?: string;
  first: ReactNode;
  second: ReactNode;
  className?: string;
};

function readStoredSize(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function ResizableSplit({
  direction,
  initialSize,
  minSize,
  maxSize,
  minSecondary = 120,
  storageKey,
  first,
  second,
  className = "",
}: ResizableSplitProps) {
  const [size, setSize] = useState(initialSize);
  const sizeRef = useRef(size);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (storageKey) {
      setSize(readStoredSize(storageKey, initialSize));
    }
  }, [storageKey, initialSize]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const clamp = useCallback(
    (value: number, containerSize: number) => {
      const cap = Math.min(maxSize, containerSize - minSecondary - 6);
      return Math.min(cap, Math.max(minSize, value));
    },
    [minSize, maxSize, minSecondary]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const containerSize =
        direction === "horizontal" ? rect.width : rect.height;
      const next =
        direction === "horizontal"
          ? e.clientX - rect.left
          : e.clientY - rect.top;
      setSize(clamp(next, containerSize));
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (storageKey) {
        localStorage.setItem(storageKey, String(sizeRef.current));
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [direction, clamp, storageKey]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor =
      direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={`flex min-h-0 min-w-0 ${isHorizontal ? "flex-row" : "flex-col"} ${className}`}
    >
      <div
        className="min-h-0 min-w-0 shrink-0 overflow-hidden"
        style={
          isHorizontal
            ? { width: size, height: "100%" }
            : { height: size, width: "100%" }
        }
      >
        {first}
      </div>

      <div
        role="separator"
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
        aria-label="Resize panels"
        onMouseDown={startDrag}
        className={`group z-10 shrink-0 touch-none ${
          isHorizontal
            ? "w-1.5 cursor-col-resize hover:w-2"
            : "h-1.5 cursor-row-resize hover:h-2"
        } flex items-center justify-center bg-slate-200 transition-[width,height] hover:bg-brand-500/40`}
      >
        <div
          className={`rounded-full bg-slate-400 group-hover:bg-brand-600 ${
            isHorizontal ? "h-10 w-0.5" : "h-0.5 w-10"
          }`}
        />
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{second}</div>
    </div>
  );
}
