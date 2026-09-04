"use client";
import { useCallback, useEffect, useState } from "react";

// Tiny stale-while-revalidate cache. The first visit to a screen still shows a
// loading state; every visit after that in the same session paints the last
// data instantly and refreshes in the background — kills the "Loading…" flash
// on back-and-forth navigation.
const mem = new Map<string, unknown>();

export function primeCache(key: string, value: unknown) {
  mem.set(key, value);
}

export function useCachedFetch<T>(key: string, url: string | null) {
  const [data, setData] = useState<T | undefined>(() => mem.get(key) as T | undefined);
  const [loading, setLoading] = useState(() => !mem.has(key));

  const refetch = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as T;
        mem.set(key, json);
        setData(json);
      }
    } catch {
      /* keep showing stale data */
    } finally {
      setLoading(false);
    }
  }, [key, url]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Update local state + the cache together (optimistic UI on top of the cache).
  const mutate = useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      setData((prev) => {
        const value = typeof next === "function" ? (next as (p: T | undefined) => T)(prev) : next;
        mem.set(key, value);
        return value;
      });
    },
    [key]
  );

  return { data, loading, refetch, mutate };
}
