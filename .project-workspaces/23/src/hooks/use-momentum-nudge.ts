import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useFunnelHub } from '@/features/projects';

const NUDGE_MESSAGES = [
  { threshold: 3, message: "You're on a roll — 3 steps mapped. Your funnel is taking shape 🔥", score: 42 },
  { threshold: 5, message: "Strategy locked. Your conversion potential just hit 68%", score: 68 },
  { threshold: 7, message: "Copy + pages ready. You're at 82% — time to go live?", score: 82 },
  { threshold: 10, message: "Your conversion potential just hit 88%. One click to publish 🚀", score: 88 },
];

const INACTIVITY_NUDGES = [
  "Your funnel is 80% built. Come back and finish strong 💪",
  "You're closer than you think. Hit Deploy and watch the leads come in.",
  "Everything's ready — your funnel just needs the green light.",
];

const NUDGE_STORAGE_KEY = 'intoiq_nudge_state';

interface NudgeState {
  lastThreshold: number;
  lastInactivityNudge: number;
}

function getNudgeState(): NudgeState {
  try {
    const raw = localStorage.getItem(NUDGE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastThreshold: 0, lastInactivityNudge: 0 };
}

function saveNudgeState(state: NudgeState) {
  localStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(state));
}

export function useMomentumNudge() {
  const { activeProject } = useFunnelHub();
  const nudgeStateRef = useRef(getNudgeState());
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress-based nudges
  useEffect(() => {
    if (!activeProject) return;

    const totalProgress =
      activeProject.notes.length +
      activeProject.funnelSteps.length +
      activeProject.pages.length;

    const state = nudgeStateRef.current;

    for (const nudge of NUDGE_MESSAGES) {
      if (totalProgress >= nudge.threshold && state.lastThreshold < nudge.threshold) {
        state.lastThreshold = nudge.threshold;
        saveNudgeState(state);

        // Delay slightly so it feels organic
        setTimeout(() => {
          toast(nudge.message, {
            duration: 5000,
            icon: '⚡',
            description: `Momentum Score: ${nudge.score}%`,
            action: nudge.score >= 80
              ? { label: 'Deploy Now', onClick: () => {} }
              : undefined,
          });
        }, 1500);
        break;
      }
    }
  }, [activeProject]);

  // Inactivity nudge — if user hasn't interacted for 3 minutes
  const resetInactivityTimer = useCallback(() => {
    if (activityTimer.current) clearTimeout(activityTimer.current);

    activityTimer.current = setTimeout(() => {
      const state = nudgeStateRef.current;
      const now = Date.now();
      // Max one inactivity nudge per 10 minutes
      if (now - state.lastInactivityNudge < 600_000) return;

      const msg = INACTIVITY_NUDGES[Math.floor(Math.random() * INACTIVITY_NUDGES.length)];
      state.lastInactivityNudge = now;
      saveNudgeState(state);

      toast(msg, {
        duration: 6000,
        icon: '🎯',
      });
    }, 180_000); // 3 minutes
  }, []);

  useEffect(() => {
    const events = ['click', 'keydown', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (activityTimer.current) clearTimeout(activityTimer.current);
    };
  }, [resetInactivityTimer]);
}
