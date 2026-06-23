import { create } from 'zustand';

/* ── Expression Types ─────────────────────────────────────── */

export type ExpressionType =
  | 'idle'
  | 'glow'       // Plan/goal completed
  | 'sparkle'    // Milestone achieved
  | 'wave'       // Returning after absence
  | 'thinking'   // Nudge queued / companion has something to say
  | 'sleepy'     // Late night / companion resting
  | 'glint'      // Gift received — quick shimmer
  | 'pulse'      // Combo pattern — urgent/compounding insight
  | 'ripple';    // Combo pattern — cross-reference discovery

export type NudgeType =
  | 'absence'
  | 'overdue_plan'
  | 'memory_anniversary'
  | 'goal_milestone'
  | 'story_reference'
  | 'detected_pattern';

export type AmbientState =
  | { type: 'name' }                                   // Default: just show name
  | { type: 'contextual'; text: string; emoji?: string; expiresAt: number };

export interface Nudge {
  id: string;
  type: NudgeType;
  text: string;
  priority: number;     // Higher = more important
  category: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

/* ── Store Shape ──────────────────────────────────────────── */

interface CompanionExpressionState {
  // Micro-expression
  expression: ExpressionType;
  expressionExpiresAt: number | null;

  // Nudges
  activeNudges: Nudge[];
  lastTriggerTimestamps: Record<NudgeType, number>;

  // Ambient label (second line under avatar)
  ambient: AmbientState;

  // 3% rule tracking
  lastSpecialBehaviorAt: number;

  // Actions
  triggerExpression: (type: ExpressionType, durationMs?: number) => void;
  clearExpression: () => void;

  triggerNudge: (nudge: Omit<Nudge, 'id' | 'createdAt'>) => void;
  dismissNudge: (id: string) => void;
  clearAllNudges: () => void;
  getTopNudge: () => Nudge | null;

  setAmbient: (ambient: AmbientState) => void;
  setContextualAmbient: (text: string, emoji?: string, durationMs?: number) => void;

  /** Rolls the 3% dice — returns true if a random ambient behavior should fire */
  rollSpecialBehavior: () => boolean;
}

/* ── Helpers ──────────────────────────────────────────────── */

let expressionTimer: ReturnType<typeof setTimeout> | null = null;

const LS_KEY_TIMESTAMPS = 'nudge-trigger-timestamps';

function loadTimestamps(): Record<NudgeType, number> {
  try {
    const raw = localStorage.getItem(LS_KEY_TIMESTAMPS);
    return raw ? JSON.parse(raw) : ({} as Record<NudgeType, number>);
  } catch {
    return {} as Record<NudgeType, number>;
  }
}

function saveTimestamps(ts: Record<NudgeType, number>) {
  try {
    localStorage.setItem(LS_KEY_TIMESTAMPS, JSON.stringify(ts));
  } catch { /* noop */ }
}

const EXPRESSION_DURATIONS: Record<ExpressionType, number> = {
  idle: 0,
  glow: 2500,
  sparkle: 1800,
  wave: 2000,
  thinking: 6000,
  sleepy: 0, // persistent until cleared
  glint: 1200,
  pulse: 3500,
  ripple: 3000,
};

const SPECIAL_BEHAVIOR_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between randoms
const SPECIAL_BEHAVIOR_CHANCE = 0.03; // 3%

/* ── Store ────────────────────────────────────────────────── */

export const useCompanionExpressionStore = create<CompanionExpressionState>((set, get) => ({
  expression: 'idle',
  expressionExpiresAt: null,
  activeNudges: [],
  lastTriggerTimestamps: loadTimestamps(),
  ambient: { type: 'name' },
  lastSpecialBehaviorAt: 0,

  triggerExpression: (type, durationMs) => {
    if (expressionTimer) clearTimeout(expressionTimer);

    const duration = durationMs ?? EXPRESSION_DURATIONS[type];
    const expiresAt = duration > 0 ? Date.now() + duration : null;

    set({ expression: type, expressionExpiresAt: expiresAt });

    if (duration > 0) {
      expressionTimer = setTimeout(() => {
        set({ expression: 'idle', expressionExpiresAt: null });
        expressionTimer = null;
      }, duration);
    }
  },

  clearExpression: () => {
    if (expressionTimer) clearTimeout(expressionTimer);
    expressionTimer = null;
    set({ expression: 'idle', expressionExpiresAt: null });
  },

  triggerNudge: (nudge) => {
    const id = `${nudge.type}-${Date.now()}`;
    const now = Date.now();
    set((s) => ({
      activeNudges: [...s.activeNudges, { ...nudge, id, createdAt: now }]
        .sort((a, b) => b.priority - a.priority),
      lastTriggerTimestamps: (() => {
        const updated = { ...s.lastTriggerTimestamps, [nudge.type]: now };
        saveTimestamps(updated);
        return updated;
      })(),
    }));
  },

  dismissNudge: (id) => {
    set((s) => ({
      activeNudges: s.activeNudges.filter((n) => n.id !== id),
    }));
  },

  clearAllNudges: () => set({ activeNudges: [] }),

  getTopNudge: () => {
    const { activeNudges } = get();
    return activeNudges.length > 0 ? activeNudges[0] : null;
  },

  setAmbient: (ambient) => set({ ambient }),

  setContextualAmbient: (text, emoji, durationMs = 120_000) => {
    const expiresAt = Date.now() + durationMs;
    set({ ambient: { type: 'contextual', text, emoji, expiresAt } });

    setTimeout(() => {
      const current = get().ambient;
      if (current.type === 'contextual' && current.expiresAt === expiresAt) {
        set({ ambient: { type: 'name' } });
      }
    }, durationMs);
  },

  rollSpecialBehavior: () => {
    const now = Date.now();
    const { lastSpecialBehaviorAt } = get();
    if (now - lastSpecialBehaviorAt < SPECIAL_BEHAVIOR_COOLDOWN_MS) return false;
    const roll = Math.random() < SPECIAL_BEHAVIOR_CHANCE;
    if (roll) set({ lastSpecialBehaviorAt: now });
    return roll;
  },
}));
