"use client";

import { useCallback, useRef, useState } from "react";

type WithId = { id: string };

/**
 * Behaves like useState for an array of records, but transparently
 * persists any change (add / edit / delete) to /api/records/<table>.
 *
 * This lets the rest of the FarmPulse UI keep calling setFlocks(prev => [...]),
 * setFlocks(prev => prev.filter(...)), etc. exactly as it did when state was
 * purely local — every call is diffed against the previous array and the
 * minimal set of POST/PUT/DELETE requests is fired automatically.
 */
export function useSyncedRecords<T extends WithId>(table: string) {
  const [state, setStateRaw] = useState<T[]>([]);
  const syncingIds = useRef<Set<string>>(new Set());

  const setState = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setStateRaw((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T[]) => T[])(prev)
            : updater;

        void syncDiff(table, prev, next, setStateRaw);
        return next;
      });
    },
    [table],
  );

  const loadInitial = useCallback((rows: T[]) => {
    setStateRaw(rows);
  }, []);

  return [state, setState, loadInitial] as const;
}

async function syncDiff<T extends WithId>(
  table: string,
  prev: T[],
  next: T[],
  setStateRaw: (updater: (p: T[]) => T[]) => void,
) {
  const prevMap = new Map(prev.map((r) => [r.id, r]));
  const nextMap = new Map(next.map((r) => [r.id, r]));

  // Deletions
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) {
      fetch(`/api/records/${table}/${id}`, { method: "DELETE" }).catch(
        () => {},
      );
    }
  }

  // Additions
  for (const [id, row] of nextMap) {
    if (!prevMap.has(id)) {
      const { id: tempId, ...payload } = row as any;
      fetch(`/api/records/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((serverRow) => {
          if (!serverRow) return;
          // Swap the temp client id for the real server id, in place.
          setStateRaw((current) =>
            current.map((r) =>
              (r as any).id === tempId ? { ...r, ...serverRow } : r,
            ),
          );
        })
        .catch(() => {});
      continue;
    }

    // Updates
    const before = prevMap.get(id)!;
    if (JSON.stringify(before) !== JSON.stringify(row)) {
      const { id: _id, ...payload } = row as any;
      fetch(`/api/records/${table}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }
}
