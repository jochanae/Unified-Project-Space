import { useState, useCallback } from "react";

export type AlignmentStatus = "aligned" | "partial" | "drift" | "no-builds" | "empty";

export interface AlignmentItemResult {
  name: string;
  found: boolean;
  matchedFile?: string;
}

export interface AlignmentResult {
  status: AlignmentStatus;
  pages: AlignmentItemResult[];
  components: AlignmentItemResult[];
  entities: AlignmentItemResult[];
  builtFileCount: number;
  checkedAt: string;
}

export function useModelAlignment(projectId: number | null) {
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/model/alignment`);
      if (!res.ok) return;
      const data: AlignmentResult = await res.json();
      setAlignment(data);
    } catch {
      // non-fatal — alignment is a read-only check, never blocks the UI
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { alignment, loading, refetch };
}
