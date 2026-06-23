import { useEffect, useState, useCallback } from "react";
import {
  getActiveCollectionId,
  setActiveCollectionId,
  listCollections,
  createCollection,
  type VaultCollection,
} from "@/lib/vault";

export function useActiveCollection(userId: string | undefined) {
  const [collections, setCollections] = useState<VaultCollection[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(getActiveCollectionId());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCollections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listCollections(userId);
      setCollections(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string | null>).detail ?? null;
      setActiveIdState(id);
    };
    window.addEventListener("vault:active-changed", onChange);
    return () => window.removeEventListener("vault:active-changed", onChange);
  }, []);

  const setActive = useCallback((id: string | null) => {
    setActiveCollectionId(id);
    setActiveIdState(id);
  }, []);

  const createAndActivate = useCallback(
    async (title: string) => {
      if (!userId) return null;
      const c = await createCollection(userId, title);
      await refresh();
      setActive(c.id);
      return c;
    },
    [userId, refresh, setActive],
  );

  const active = collections.find((c) => c.id === activeId) ?? null;

  return { collections, active, activeId, loading, setActive, createAndActivate, refresh };
}
