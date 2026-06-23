import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanionExpressionStore } from '@/stores/useCompanionExpressionStore';
import type { NudgeType, ExpressionType } from '@/stores/useCompanionExpressionStore';
import { getToneForStyle, renderPatternNudge } from '@/lib/patternExpressions';

/* ── Config: which triggers are active ────────────────────── */

const ACTIVE_TRIGGERS: NudgeType[] = ['absence', 'overdue_plan', 'detected_pattern'];

// These exist in the engine but are dormant until enabled:
// 'memory_anniversary', 'goal_milestone', 'story_reference'

const NUDGE_COOLDOWNS: Record<NudgeType, number> = {
  absence: 12 * 60 * 60 * 1000,        // 12h
  overdue_plan: 4 * 60 * 60 * 1000,    // 4h
  detected_pattern: 24 * 60 * 60 * 1000, // 24h
  memory_anniversary: 24 * 60 * 60 * 1000,
  goal_milestone: 8 * 60 * 60 * 1000,
  story_reference: 24 * 60 * 60 * 1000,
};

const NUDGE_PRIORITIES: Record<NudgeType, number> = {
  goal_milestone: 90,
  overdue_plan: 70,
  detected_pattern: 60,
  absence: 50,
  memory_anniversary: 40,
  story_reference: 30,
};

/* ── Engine Hook ──────────────────────────────────────────── */

interface UseNudgeEngineParams {
  userId: string | null;
  companionName: string;
  communicationStyle?: string | null;
  daysSinceLastLogin: number;
}

export function useNudgeEngine({ userId, companionName, communicationStyle, daysSinceLastLogin }: UseNudgeEngineParams) {
  const {
    triggerNudge, triggerExpression, setContextualAmbient,
    rollSpecialBehavior, lastTriggerTimestamps, activeNudges,
  } = useCompanionExpressionStore();
  const evaluated = useRef(false);

  useEffect(() => {
    if (!userId || evaluated.current) return;
    evaluated.current = true;

    const run = async () => {
      const now = Date.now();

      const canTrigger = (type: NudgeType) => {
        if (!ACTIVE_TRIGGERS.includes(type)) return false;
        const last = lastTriggerTimestamps[type] || 0;
        return now - last > NUDGE_COOLDOWNS[type];
      };

      // ── Absence trigger ──
      if (canTrigger('absence') && daysSinceLastLogin >= 1) {
        triggerExpression('wave', 2500);

        const text = daysSinceLastLogin === 1
          ? 'noticed you were away'
          : daysSinceLastLogin <= 7
            ? 'missed you 💛'
            : 'kept the light on 🕯️';

        triggerNudge({
          type: 'absence',
          text,
          priority: NUDGE_PRIORITIES.absence,
          category: 'engagement',
        });

        setContextualAmbient(
          daysSinceLastLogin === 1 ? 'missed you' : 'welcome back',
          daysSinceLastLogin === 1 ? '💛' : '🕯️',
          60_000,
        );
      }

      // ── Overdue plan trigger (await so 3% roll checks after) ──
      if (canTrigger('overdue_plan')) {
        await evaluateOverduePlans(userId, companionName, triggerNudge, setContextualAmbient);
      }

      // ── Detected pattern trigger ──
      if (canTrigger('detected_pattern')) {
        await evaluateDetectedPatterns(userId, communicationStyle ?? null, triggerNudge, triggerExpression, setContextualAmbient);
      }

      // ── 3% ambient roll (only if no earned triggers fired) ──
      const nudgesAfterEarned = useCompanionExpressionStore.getState().activeNudges;
      if (nudgesAfterEarned.length === 0 && rollSpecialBehavior()) {
        applyRandomAmbient(companionName, triggerExpression, setContextualAmbient);
      }
    };

    run();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ── Detected Pattern Evaluator ────────────────────────────── */

async function evaluateDetectedPatterns(
  userId: string,
  communicationStyle: string | null,
  triggerNudge: (nudge: { type: NudgeType; text: string; priority: number; category: string }) => void,
  triggerExpression: (type: ExpressionType, duration?: number) => void,
  setContextualAmbient: (text: string, emoji?: string, durationMs?: number) => void,
) {
  try {
    const { data: patterns } = await supabase
      .from('detected_patterns')
      .select('id, pattern_type, pattern_category, pattern_data, confidence_score, last_surfaced_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('confidence_score', 0.75)
      .order('confidence_score', { ascending: false })
      .limit(3);

    if (!patterns || patterns.length === 0) return;

    // Filter out patterns surfaced in the last 24h
    const now = Date.now();
    const surfaceable = patterns.filter((p) => {
      if (p.last_surfaced_at) {
        const lastSurfaced = new Date(p.last_surfaced_at).getTime();
        if (now - lastSurfaced < 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });

    if (surfaceable.length === 0) return;

    // 2C — Day-of-week patterns belong on the Insights/Blueprint surface, not in greetings.
    // They reference a specific weekday (e.g. "Saturdays") and feel off when surfaced any other day.
    const GREETING_EXCLUDED_PATTERN_TYPES = new Set([
      'energy_dip',
      'combo_dip_followthrough',
      'combo_dip_gap',
    ]);
    const eligible = surfaceable.filter((p) => !GREETING_EXCLUDED_PATTERN_TYPES.has(p.pattern_type));
    if (eligible.length === 0) return;

    // Pick the top pattern
    const pattern = eligible[0];
    const tone = getToneForStyle(communicationStyle);
    const patternData = (pattern.pattern_data || {}) as Record<string, unknown>;
    const rendered = renderPatternNudge(pattern.pattern_type, tone, patternData);

    if (!rendered) return;

    // Choose expression + emoji based on pattern type
    const isCombo = pattern.pattern_type.startsWith('combo_');
    const expressionMap: Record<string, 'glow' | 'sparkle' | 'thinking' | 'pulse' | 'ripple'> = {
      positive_reinforcement: 'sparkle',
      energy_dip: 'thinking',
      engagement_gap: 'thinking',
      follow_through: 'thinking',
      pre_event: 'glow',
      combo_dip_followthrough: 'pulse',
      combo_gap_followthrough: 'pulse',
      combo_momentum_event: 'ripple',
      combo_dip_gap: 'pulse',
    };

    const emojiMap: Record<string, string> = {
      positive_reinforcement: '✨',
      energy_dip: '🔋',
      engagement_gap: '👋',
      follow_through: '🎯',
      pre_event: '📅',
      combo_dip_followthrough: '🔗',
      combo_gap_followthrough: '🔗',
      combo_momentum_event: '🚀',
      combo_dip_gap: '⚡',
    };

    const ambientTextMap: Record<string, string> = {
      positive_reinforcement: 'proud of you',
      energy_dip: 'noticed something',
      engagement_gap: 'missed you',
      follow_through: 'noticed a pattern',
      pre_event: 'thinking ahead',
      combo_dip_followthrough: 'connected the dots',
      combo_gap_followthrough: 'seeing a link',
      combo_momentum_event: 'you\'re on fire',
      combo_dip_gap: 'checking in',
    };

    const expr = expressionMap[pattern.pattern_type] || 'thinking';
    const emoji = emojiMap[pattern.pattern_type] || '🔮';
    const ambientText = ambientTextMap[pattern.pattern_type] || 'noticed something';

    // Combos get a longer expression + slightly higher priority
    const duration = isCombo ? 4000 : 3000;
    triggerExpression(expr, duration);

    triggerNudge({
      type: 'detected_pattern',
      text: rendered,
      priority: isCombo ? NUDGE_PRIORITIES.detected_pattern + 15 : NUDGE_PRIORITIES.detected_pattern,
      category: pattern.pattern_category,
    });

    setContextualAmbient(ambientText, emoji, isCombo ? 90_000 : 60_000);

    // Update surfaced_count and last_surfaced_at (fire and forget, service role handles writes)
    // This uses the user's token but the RLS only allows SELECT for users — 
    // the chat edge function will handle the update when the pattern is actually referenced in conversation
  } catch (e) {
    console.error('[NudgeEngine] pattern evaluation failed:', e);
  }
}

/* ── Overdue Plan Evaluator ───────────────────────────────── */

async function evaluateOverduePlans(
  userId: string,
  companionName: string,
  triggerNudge: (nudge: { type: NudgeType; text: string; priority: number; category: string }) => void,
  setContextualAmbient: (text: string, emoji?: string, durationMs?: number) => void,
) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: plans } = await supabase
      .from('companion_plans')
      .select('title, status, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lt('updated_at', today)
      .limit(3);

    if (plans && plans.length > 0) {
      const planTitle = plans[0].title;
      triggerNudge({
        type: 'overdue_plan',
        text: `Did you get to "${planTitle}"?`,
        priority: NUDGE_PRIORITIES.overdue_plan,
        category: 'accountability',
      });
      setContextualAmbient('checking in', '📋', 45_000);
    }
  } catch (e) {
    console.error('[NudgeEngine] overdue plan check failed:', e);
  }
}

/* ── Random Ambient Behaviors (3% rule) ───────────────────── */

function applyRandomAmbient(
  companionName: string,
  triggerExpression: (type: ExpressionType, duration?: number) => void,
  setContextualAmbient: (text: string, emoji?: string, durationMs?: number) => void,
) {
  const hour = new Date().getHours();
  const pool: { text: string; emoji: string; expression: 'glow' | 'sparkle' | 'thinking' }[] = [];

  if (hour >= 5 && hour < 12) {
    pool.push({ text: 'good morning', emoji: '🌅', expression: 'glow' });
    pool.push({ text: 'here with you', emoji: '☀️', expression: 'sparkle' });
  } else if (hour >= 12 && hour < 17) {
    pool.push({ text: 'nearby', emoji: '💭', expression: 'thinking' });
    pool.push({ text: 'thinking...', emoji: '✨', expression: 'thinking' });
  } else if (hour >= 17 && hour < 22) {
    pool.push({ text: 'winding down', emoji: '🌇', expression: 'glow' });
    pool.push({ text: 'here with you', emoji: '🌙', expression: 'glow' });
  } else {
    pool.push({ text: 'here if you need me', emoji: '🌙', expression: 'glow' });
    pool.push({ text: 'resting nearby', emoji: '💤', expression: 'glow' });
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  triggerExpression(pick.expression, 3000);
  setContextualAmbient(pick.text, pick.emoji, 90_000);
}
