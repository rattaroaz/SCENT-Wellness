"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function readStoredKeys(storageKey: string): Set<string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return null;
  }
}

function writeStoredKeys(storageKey: string, keys: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify([...keys]));
}

export function useTreeExpansion(
  allKeys: string[],
  options?: { storageKey?: string; defaultExpanded?: boolean }
) {
  const { storageKey, defaultExpanded = true } = options ?? {};
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (allKeys.length === 0) return;

    setExpanded((prev) => {
      if (!initialized.current) {
        initialized.current = true;
        const stored = storageKey ? readStoredKeys(storageKey) : null;
        if (stored) {
          const fromStore = new Set(allKeys.filter((k) => stored.has(k)));
          return fromStore.size > 0 ? fromStore : new Set(allKeys);
        }
        return defaultExpanded ? new Set(allKeys) : new Set();
      }

      const next = new Set(prev);
      for (const k of allKeys) {
        if (!prev.has(k) && defaultExpanded) next.add(k);
      }
      for (const k of [...next]) {
        if (!allKeys.includes(k)) next.delete(k);
      }
      return next;
    });
  }, [allKeys.join("|"), storageKey, defaultExpanded]);

  const persist = useCallback(
    (next: Set<string>) => {
      if (storageKey) writeStoredKeys(storageKey, next);
    },
    [storageKey]
  );

  const isExpanded = useCallback((key: string) => expanded.has(key), [expanded]);

  const toggle = useCallback(
    (key: string) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const expandAll = useCallback(() => {
    const next = new Set(allKeys);
    setExpanded(next);
    persist(next);
  }, [allKeys, persist]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
    persist(new Set());
  }, [persist]);

  return { isExpanded, toggle, expandAll, collapseAll };
}
