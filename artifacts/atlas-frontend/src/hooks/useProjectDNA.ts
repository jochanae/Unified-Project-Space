import { useState, useEffect, useCallback, useRef } from "react";

export type DnaFieldStatus = "guessed" | "inferred" | "confirmed" | "committed";

export interface AMExperienceIntent {
  emotionalRegister?: string[];
  interactionPosture?: string[];
  visualLanguage?: string[];
  designPrinciples?: string[];
  confidence?: number;
  lastConfirmed?: string | null;
}

export interface AMVisualSketch {
  analyzedAt: string;
  description: string;
  signals: {
    emotionalRegister?: string[];
    visualLanguage?: string[];
    designPrinciples?: string[];
  };
}

export interface ProjectDNA {
  id: number;
  projectId: number;
  creativePrinciples: string[];
  experienceIntent: AMExperienceIntent;
  visualSketches: AMVisualSketch[];
  confidence: Partial<Record<string, number>>;
  status: Partial<Record<string, DnaFieldStatus>>;
  updatedAt: string;
}

export interface ProjectDNAPatch {
  creativePrinciples?: string[];
  experienceIntent?: AMExperienceIntent;
  visualSketches?: AMVisualSketch[];
  confidence?: Partial<Record<string, number>>;
  status?: Partial<Record<string, DnaFieldStatus>>;
}

export function useProjectDNA(projectId: number | null) {
  const [dna, setDna] = useState<ProjectDNA | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/dna`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProjectDNA = await res.json();
      setDna(data);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load DNA");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  const patch = useCallback(async (update: ProjectDNAPatch): Promise<ProjectDNA | null> => {
    if (!projectId) return null;
    try {
      const res = await fetch(`/api/projects/${projectId}/dna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProjectDNA = await res.json();
      setDna(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "DNA patch failed");
      return null;
    }
  }, [projectId]);

  return { dna, loading, error, refetch: load, patch };
}
