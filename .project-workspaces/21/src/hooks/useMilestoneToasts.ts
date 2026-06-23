import { useEffect } from 'react';
import { toast } from 'sonner';

interface MilestoneCheckParams {
  companionName: string;
  msgCount: number;
  streak: number;
  completionPct: number;
  companionCount: number;
  connectionMode?: string;
}

const MILESTONE_KEY_PREFIX = 'compani-milestone-';
const LAST_VISIT_KEY = 'compani-last-visit';

function wasSeen(key: string): boolean {
  return localStorage.getItem(MILESTONE_KEY_PREFIX + key) === '1';
}
function markSeen(key: string) {
  localStorage.setItem(MILESTONE_KEY_PREFIX + key, '1');
}

type Mode = 'friend' | 'mentor' | 'accountability' | 'romantic';

function resolveMode(connectionMode?: string): Mode {
  if (!connectionMode) return 'friend';
  const m = connectionMode.toLowerCase();
  if (m.includes('mentor')) return 'mentor';
  if (m.includes('account') || m.includes('accountability')) return 'accountability';
  if (m.includes('romantic')) return 'romantic';
  return 'friend';
}

const toastStyle = {
  background: 'hsl(270 40% 10%)',
  color: 'white',
  borderLeft: '4px solid hsl(350 45% 65%)',
};

/**
 * Checks for gamification milestones and queues warm toast notifications.
 * Shows at most ONE milestone toast per companion per page load (highest tier).
 * Also shows a welcome-back toast once per calendar day.
 */
export function useMilestoneToasts({
  companionName,
  msgCount,
  streak,
  completionPct,
  companionCount,
  connectionMode,
}: MilestoneCheckParams) {

  // Welcome-back toast — DISABLED here; AppLayout already handles role-aware welcome toasts.
  // Keeping the last-visit key update for other features that depend on it.
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
    if (lastVisit !== today && companionName) {
      localStorage.setItem(LAST_VISIT_KEY, today);
    }
  }, []);

  // Milestone toasts — one highest per companion per page load
  useEffect(() => {
    if (!companionName) return;

    const mode = resolveMode(connectionMode);

    // Build all possible milestones ordered by priority (highest first)
    const milestones: { key: string; threshold: () => boolean; msg: string }[] = [
      // 5 companions (global, not per-companion)
      {
        key: 'full-circle',
        threshold: () => companionCount >= 5,
        msg: `You've built your full circle ✨`,
      },
      // 100% completion
      {
        key: `complete-${companionName}`,
        threshold: () => completionPct >= 1,
        msg: `✨ ${companionName} is fully yours — new styles unlocked in Studio!`,
      },
      // Bond level 3 (300 msgs)
      {
        key: `bond-unbreakable-${companionName}`,
        threshold: () => msgCount >= 300,
        msg: {
          friend: `🧡 You and ${companionName} — unbreakable.`,
          mentor: `🧡 300 conversations with ${companionName} — a bond forged in growth.`,
          accountability: `🧡 300 check-ins with ${companionName} — that's real commitment.`,
          romantic: `🧡 You and ${companionName} — unbreakable.`,
        }[mode],
      },
      // Bond level 2 (150 msgs)
      {
        key: `bond-deep-${companionName}`,
        threshold: () => msgCount >= 150,
        msg: {
          friend: `✨ You and ${companionName} — solid.`,
          mentor: `✨ ${companionName} has helped you grow in ways you might not even see yet.`,
          accountability: `✨ 150 sessions with ${companionName} — that's discipline.`,
          romantic: `✨ You and ${companionName} share a deep bond.`,
        }[mode],
      },
      // Bond level 1 (50 msgs)
      {
        key: `bond-growing-${companionName}`,
        threshold: () => msgCount >= 50,
        msg: {
          friend: `🌱 You and ${companionName} are building something real.`,
          mentor: `🌱 50 conversations of growth with ${companionName}.`,
          accountability: `🌱 50 check-ins with ${companionName} — consistency wins.`,
          romantic: `🌱 You and ${companionName} are growing closer.`,
        }[mode],
      },
      // 7-day streak
      {
        key: `streak7-${companionName}`,
        threshold: () => streak >= 7,
        msg: {
          friend: `🔥 7 days together — you're building something real.`,
          mentor: `🔥 7 days of showing up for growth — respect.`,
          accountability: `🔥 7-day streak with ${companionName} — momentum is real.`,
          romantic: `🔥 7 days together — you're building something real.`,
        }[mode],
      },
      // First message
      {
        key: `first-msg-${companionName}`,
        threshold: () => msgCount >= 1,
        msg: `💛 Your journey with ${companionName} begins today.`,
      },
    ];

    // Find all pending (unseen + threshold met)
    const pending = milestones.filter(m => m.threshold() && !wasSeen(m.key));

    if (pending.length === 0) return;

    // Show only the highest priority (first in list), mark ALL as seen
    const highest = pending[0];
    for (const m of pending) {
      markSeen(m.key);
    }

    // Delay to avoid competing with welcome-back toast and sanctuary lock animation
    setTimeout(() => {
      toast(highest.msg, {
        duration: 4000,
        style: toastStyle,
        position: 'bottom-center',
      });
    }, 6000);
  }, [companionName, msgCount, streak, completionPct, companionCount, connectionMode]);
}
