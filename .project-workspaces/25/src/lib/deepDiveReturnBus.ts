/**
 * Tiny pub/sub so any UI surface can announce "a Deep Dive just launched"
 * and the reader can show a "Return to reading" banner. Decoupled from
 * React so it works from plain helpers like openDeepDiveLink.
 */
import type { DeepDiveProvider } from "@/lib/deepDive";

export type DeepDiveLaunchEvent = {
  provider: DeepDiveProvider;
  reference: string;
};

type Listener = (event: DeepDiveLaunchEvent) => void;

const listeners = new Set<Listener>();

export function emitDeepDiveLaunched(event: DeepDiveLaunchEvent): void {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* swallow — never let one listener break another */
    }
  });
}

export function onDeepDiveLaunched(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
