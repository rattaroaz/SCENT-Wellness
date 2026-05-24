"use client";

import { useEffect, useState } from "react";

/** Client-only clock for countdowns; avoids SSR/hydration mismatches from Date.now(). */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
