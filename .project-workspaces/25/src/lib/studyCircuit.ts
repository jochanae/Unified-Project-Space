/**
 * Study Circuit — a session-state "Scripture Playlist" launched from a Vault
 * collection. While active, the Reader's thumb-zone arrows step through the
 * circuit's verses (instead of next/prev chapter), and the header title is
 * replaced with a progress pill.
 *
 * Persisted to localStorage for instant restore + the Supabase
 * `study_circuit_sessions` table for cross-device resume. localStorage is the
 * source of truth during a session; the DB is a debounced mirror.
 */

import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "sanctumiq:study-circuit";
const CHANGED_EVENT = "studycircuit:changed";

export type CircuitStop = {
  itemId: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  reference: string;
};

export type StudyCircuit = {
  collectionId: string;
  collectionTitle: string;
  collectionColor: string;
  stops: CircuitStop[];
  /** Zero-based index into stops. */
  currentIndex: number;
  startedAt: string;
};

function emitChange(circuit: StudyCircuit | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StudyCircuit | null>(CHANGED_EVENT, { detail: circuit }));
}

export function getStudyCircuit(): StudyCircuit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyCircuit;
    if (!parsed || !Array.isArray(parsed.stops) || parsed.stops.length === 0) return null;
    if (typeof parsed.currentIndex !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cross-device sync (Supabase) — debounced upserts so rapid arrow-tapping
// doesn't hammer the database. localStorage stays the instant source of truth.
// ---------------------------------------------------------------------------

let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 800;

function scheduleCloudSync(circuit: StudyCircuit | null) {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void pushCloudSync(circuit);
  }, SYNC_DEBOUNCE_MS);
}

async function pushCloudSync(circuit: StudyCircuit | null) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    if (!circuit) {
      await supabase.from("study_circuit_sessions").delete().eq("user_id", userId);
      return;
    }
    await supabase.from("study_circuit_sessions").upsert(
      [
        {
          user_id: userId,
          collection_id: circuit.collectionId,
          collection_title: circuit.collectionTitle,
          collection_color: circuit.collectionColor,
          stops: circuit.stops as never,
          current_index: circuit.currentIndex,
          started_at: circuit.startedAt,
        },
      ],
      { onConflict: "user_id" },
    );
  } catch {
    // Best-effort; localStorage already holds the truth for this device.
  }
}

/**
 * Hydrate the circuit from the cloud on app start. If a cloud session exists
 * and there is no local circuit (or the local one is stale), adopt it.
 */
export async function hydrateStudyCircuitFromCloud(): Promise<StudyCircuit | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return null;
    const { data, error } = await supabase
      .from("study_circuit_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;

    const stops = (data.stops as unknown as CircuitStop[]) ?? [];
    if (!Array.isArray(stops) || stops.length === 0) return null;

    const local = getStudyCircuit();
    const cloud: StudyCircuit = {
      collectionId: data.collection_id,
      collectionTitle: data.collection_title,
      collectionColor: data.collection_color,
      stops,
      currentIndex: Math.min(Math.max(0, data.current_index ?? 0), stops.length - 1),
      startedAt: data.started_at,
    };

    // If the local circuit is for a different collection or further behind, prefer cloud.
    const localStartedMs = local ? Date.parse(local.startedAt) : 0;
    const cloudStartedMs = Date.parse(cloud.startedAt);
    const adopt =
      !local || local.collectionId !== cloud.collectionId || cloudStartedMs > localStartedMs;

    if (adopt) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
      emitChange(cloud);
      return cloud;
    }
    return local;
  } catch {
    return null;
  }
}

export function startStudyCircuit(
  circuit: Omit<StudyCircuit, "startedAt" | "currentIndex"> & {
    currentIndex?: number;
  },
): StudyCircuit | null {
  if (typeof window === "undefined") return null;
  if (!circuit.stops.length) return null;
  const next: StudyCircuit = {
    ...circuit,
    currentIndex: Math.min(Math.max(0, circuit.currentIndex ?? 0), circuit.stops.length - 1),
    startedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitChange(next);
  scheduleCloudSync(next);
  return next;
}

export function exitStudyCircuit() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  emitChange(null);
  scheduleCloudSync(null);
}

export function setCircuitIndex(index: number): StudyCircuit | null {
  const current = getStudyCircuit();
  if (!current) return null;
  const safe = Math.min(Math.max(0, index), current.stops.length - 1);
  if (safe === current.currentIndex) return current;
  const next: StudyCircuit = { ...current, currentIndex: safe };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitChange(next);
  scheduleCloudSync(next);
  return next;
}

export function advanceCircuit(): StudyCircuit | null {
  const current = getStudyCircuit();
  if (!current) return null;
  return setCircuitIndex(current.currentIndex + 1);
}

export function rewindCircuit(): StudyCircuit | null {
  const current = getStudyCircuit();
  if (!current) return null;
  return setCircuitIndex(current.currentIndex - 1);
}

export const STUDY_CIRCUIT_EVENT = CHANGED_EVENT;
