import { useEffect, useRef, useCallback } from 'react';

/**
 * Conversion Attribution Tracker
 * ------------------------------
 * Lightweight client-side tracker for published landing pages. Captures four
 * signals so MarQ can profile the conversion journey:
 *   - primary_block_id: block with the highest visible dwell time
 *   - dwell_time_ms:    how long that block stayed in the viewport
 *   - scroll_depth:     0–1, deepest scroll position reached
 *   - timestamp_at_conversion: ISO timestamp when getAttribution() was called
 *
 * Plus contextual extras for the "Conversion Snapshot" UI:
 *   - session_duration_ms, exit_intent_triggered, block_dwells (full map)
 *
 * Usage:
 *   const trackerRef = useAttributionTracker();
 *   // tag rendered sections with data-block-id="..."
 *   const attribution = trackerRef.current?.getAttribution();
 */

export interface AttributionSnapshot {
  primary_block_id: string | null;
  dwell_time_ms: number;
  scroll_depth: number;
  timestamp_at_conversion: string;
  session_duration_ms: number;
  exit_intent_triggered: boolean;
  block_dwells: Record<string, number>;
}

export interface AttributionTracker {
  getAttribution: () => AttributionSnapshot;
}

export function useAttributionTracker() {
  const ref = useRef<AttributionTracker | null>(null);
  const dwellsRef = useRef<Record<string, number>>({});
  const visibleRef = useRef<Record<string, number>>({}); // blockId -> entered timestamp ms
  const scrollDepthRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(Date.now());
  const exitIntentRef = useRef<boolean>(false);

  // Flush a block's accumulated dwell when it exits viewport (or on snapshot)
  const flushVisible = useCallback((blockId?: string) => {
    const now = performance.now();
    const ids = blockId ? [blockId] : Object.keys(visibleRef.current);
    ids.forEach((id) => {
      const enteredAt = visibleRef.current[id];
      if (typeof enteredAt === 'number') {
        dwellsRef.current[id] = (dwellsRef.current[id] || 0) + (now - enteredAt);
        visibleRef.current[id] = now; // reset baseline so a snapshot mid-view doesn't double-count
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    sessionStartRef.current = Date.now();

    // ---- IntersectionObserver: per-block dwell ----
    const observer = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.blockId;
          if (!id) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // entered "primary view"
            if (visibleRef.current[id] == null) visibleRef.current[id] = now;
          } else {
            // exited primary view → accumulate
            const enteredAt = visibleRef.current[id];
            if (typeof enteredAt === 'number') {
              dwellsRef.current[id] = (dwellsRef.current[id] || 0) + (now - enteredAt);
              delete visibleRef.current[id];
            }
          }
        });
      },
      // 50% visible counts as "in view" — matches how a human reads a section
      { threshold: [0, 0.5, 1] },
    );

    // Observe all current and future [data-block-id] elements
    const observed = new WeakSet<Element>();
    const observeAll = () => {
      document.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
        if (!observed.has(el)) {
          observer.observe(el);
          observed.add(el);
        }
      });
    };
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    // ---- Scroll depth ----
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = (doc.scrollHeight - window.innerHeight) || 1;
      const depth = Math.min(1, Math.max(0, window.scrollY / scrollable));
      if (depth > scrollDepthRef.current) scrollDepthRef.current = depth;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ---- Exit intent (cursor leaves top of viewport) ----
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0) exitIntentRef.current = true;
    };
    document.addEventListener('mouseout', onMouseOut);

    // ---- Snapshot builder ----
    ref.current = {
      getAttribution: (): AttributionSnapshot => {
        flushVisible(); // settle any in-view blocks
        const dwells = { ...dwellsRef.current };
        let primary: string | null = null;
        let max = 0;
        Object.entries(dwells).forEach(([id, ms]) => {
          if (ms > max) {
            max = ms;
            primary = id;
          }
        });
        return {
          primary_block_id: primary,
          dwell_time_ms: Math.round(max),
          scroll_depth: Number(scrollDepthRef.current.toFixed(3)),
          timestamp_at_conversion: new Date().toISOString(),
          session_duration_ms: Date.now() - sessionStartRef.current,
          exit_intent_triggered: exitIntentRef.current,
          block_dwells: Object.fromEntries(
            Object.entries(dwells).map(([k, v]) => [k, Math.round(v)]),
          ),
        };
      },
    };

    return () => {
      observer.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onMouseOut);
      ref.current = null;
    };
  }, [flushVisible]);

  return ref;
}
