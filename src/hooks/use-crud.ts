"use client";

import { useState, useEffect, useCallback } from "react";

interface UseCrudOptions<T> {
  /** API base URL, e.g. "/api/customers" */
  url: string;
  /** Transform data before sending to API on create/update */
  transformForApi?: (data: Partial<T>) => unknown;
}

interface UseCrudReturn<T extends { id: number }> {
  items: T[];
  loading: boolean;
  error: string | null;
  add: (data: Partial<T>) => Promise<T | null>;
  update: (id: number, data: Partial<T>) => Promise<T | null>;
  remove: (id: number) => Promise<boolean>;
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useCrud<T extends { id: number }>({
  url,
  transformForApi,
}: UseCrudOptions<T>): UseCrudReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch from ${url}`);
        const data = await res.json();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const add = useCallback(
    async (data: Partial<T>): Promise<T | null> => {
      try {
        const body = transformForApi ? transformForApi(data) : data;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        return created;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    [url, transformForApi]
  );

  const update = useCallback(
    async (id: number, data: Partial<T>): Promise<T | null> => {
      try {
        const body = transformForApi ? transformForApi(data) : data;
        const res = await fetch(`${url}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        return updated;
      } catch (e) {
        console.error(e);
        return null;
      }
    },
    [url, transformForApi]
  );

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const res = await fetch(`${url}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        setItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    [url]
  );

  return { items, loading, error, add, update, remove, setItems };
}
