import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  STUDY_CIRCUIT_EVENT,
  advanceCircuit,
  exitStudyCircuit,
  getStudyCircuit,
  hydrateStudyCircuitFromCloud,
  rewindCircuit,
  setCircuitIndex,
  type StudyCircuit,
} from "@/lib/studyCircuit";

/**
 * Subscribe to the active Study Circuit (or null when not in circuit mode).
 * Updates whenever any part of the app dispatches `studycircuit:changed`,
 * and also on cross-tab `storage` events so two open tabs stay in sync.
 *
 * On mount (and whenever auth becomes ready with a signed-in user), hydrates
 * from the cloud so the user resumes their last circuit at the last index
 * from any device.
 */
export function useStudyCircuit() {
  const { user, isReady } = useAuth();
  const [circuit, setCircuit] = useState<StudyCircuit | null>(() => getStudyCircuit());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<StudyCircuit | null>).detail;
      setCircuit(detail ?? getStudyCircuit());
    };
    const onStorage = () => setCircuit(getStudyCircuit());

    window.addEventListener(STUDY_CIRCUIT_EVENT, onChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(STUDY_CIRCUIT_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Cross-device resume: once auth is ready and we have a user, fetch the
  // saved session from the cloud and adopt it if newer than local.
  useEffect(() => {
    if (!isReady || !user) return;
    let cancelled = false;
    void hydrateStudyCircuitFromCloud().then((cloud) => {
      if (cancelled) return;
      if (cloud) setCircuit(cloud);
    });
    return () => {
      cancelled = true;
    };
  }, [isReady, user]);

  const next = useCallback(() => advanceCircuit(), []);
  const prev = useCallback(() => rewindCircuit(), []);
  const goTo = useCallback((index: number) => setCircuitIndex(index), []);
  const exit = useCallback(() => exitStudyCircuit(), []);

  return {
    circuit,
    isActive: Boolean(circuit),
    currentStop: circuit ? (circuit.stops[circuit.currentIndex] ?? null) : null,
    currentIndex: circuit?.currentIndex ?? 0,
    total: circuit?.stops.length ?? 0,
    next,
    prev,
    goTo,
    exit,
  };
}
