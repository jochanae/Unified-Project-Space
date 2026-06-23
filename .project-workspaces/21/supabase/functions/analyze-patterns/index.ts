import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Minimum data points required before a pattern is considered
const MIN_DATA_POINTS = 5;
const MIN_CONFIDENCE = 0.75;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users who have been active in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data: activeUsers } = await sb
      .from("usage_tracking")
      .select("user_id")
      .gte("usage_date", thirtyDaysAgo);

    if (!activeUsers || activeUsers.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueUserIds = [...new Set(activeUsers.map((u: any) => u.user_id))];
    let processed = 0;

    for (const userId of uniqueUserIds) {
      try {
        const patterns = await detectPatternsForUser(sb, userId as string);
        
        // Fetch feedback data to adjust confidence
        const feedbackMap = await getPatternFeedback(sb, userId as string);

        for (const pattern of patterns) {
          // Apply feedback adjustment to confidence
          const feedback = feedbackMap[pattern.type];
          let adjustedConfidence = pattern.confidence;
          if (feedback) {
            const engagementRate = feedback.engaged / feedback.total;
            // Boost confidence for patterns users engage with, reduce for ignored ones
            if (feedback.total >= 3) {
              if (engagementRate >= 0.6) {
                adjustedConfidence = Math.min(0.99, adjustedConfidence + 0.05);
              } else if (engagementRate <= 0.2) {
                adjustedConfidence = Math.max(0.5, adjustedConfidence - 0.1);
              }
            }
          }

          await sb.from("detected_patterns").upsert(
            {
              user_id: userId,
              pattern_type: pattern.type,
              pattern_category: pattern.category,
              pattern_data: {
                ...pattern.data,
                feedback_engagement_rate: feedback ? Math.round((feedback.engaged / feedback.total) * 100) / 100 : null,
                feedback_sample_size: feedback?.total || 0,
              },
              confidence_score: adjustedConfidence,
              first_detected_at: new Date().toISOString(),
              last_confirmed_at: new Date().toISOString(),
              is_active: adjustedConfidence >= 0.5,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,pattern_type" }
          );
        }

        // Mark stale surfacings (>24h without engagement) as dismissed
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        await sb
          .from("pattern_surfacing_log")
          .update({ engaged: false, response_sentiment: "dismissed" })
          .eq("user_id", userId)
          .is("engaged", null)
          .lt("surfaced_at", oneDayAgo);

        processed++;
      } catch (e) {
        console.error(`[analyze-patterns] Error for user ${userId}:`, e);
      }
    }

    return new Response(JSON.stringify({ processed, users: uniqueUserIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[analyze-patterns] Fatal error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Feedback Loop ────────────────────────────────────────────────────────

interface PatternFeedback {
  total: number;
  engaged: number;
}

async function getPatternFeedback(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<Record<string, PatternFeedback>> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: logs } = await sb
    .from("pattern_surfacing_log")
    .select("pattern_type, engaged")
    .eq("user_id", userId)
    .gte("surfaced_at", thirtyDaysAgo)
    .not("engaged", "is", null);

  const map: Record<string, PatternFeedback> = {};
  if (!logs) return map;

  for (const log of logs) {
    const pt = (log as any).pattern_type;
    if (!map[pt]) map[pt] = { total: 0, engaged: 0 };
    map[pt].total++;
    if ((log as any).engaged) map[pt].engaged++;
  }
  return map;
}

// ── Pattern Detection Functions ──────────────────────────────────────────

interface DetectedPattern {
  type: string;
  category: string;
  data: Record<string, unknown>;
  confidence: number;
}

async function detectPatternsForUser(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];

  const [energyDip, engagementGap, followThrough, positiveReinforcement] = await Promise.all([
    detectEnergyDipPattern(sb, userId),
    detectEngagementGapPattern(sb, userId),
    detectFollowThroughPattern(sb, userId),
    detectPositiveReinforcementPattern(sb, userId),
  ]);

  if (energyDip) patterns.push(energyDip);
  if (engagementGap) patterns.push(engagementGap);
  if (followThrough) patterns.push(followThrough);
  if (positiveReinforcement) patterns.push(positiveReinforcement);

  // Pre-event runs separately (needs companion_plans)
  const preEvent = await detectPreEventPattern(sb, userId);
  if (preEvent) patterns.push(preEvent);

  // ── Combo pattern detection ──
  const combos = detectComboPatterns(patterns);
  patterns.push(...combos);

  return patterns;
}

// ── Combo Pattern Detection ──────────────────────────────────────────────
// Cross-references individual patterns to surface compound insights

function detectComboPatterns(basePatterns: DetectedPattern[]): DetectedPattern[] {
  const combos: DetectedPattern[] = [];
  const typeMap = new Map(basePatterns.map((p) => [p.type, p]));

  // Combo 1: Energy dip + follow-through drop
  // "You tend to lose steam on {day}, and that's also when plans fall off"
  const dip = typeMap.get("energy_dip");
  const ft = typeMap.get("follow_through");
  if (dip && ft && (ft.data.completion_rate as number) < 0.6) {
    const dipDay = dip.data.dip_day as string;
    combos.push({
      type: "combo_dip_followthrough",
      category: "behavioral",
      data: {
        observation: `${capitalize(dipDay)}s are quieter AND follow-through tends to drop — the two might be connected.`,
        dip_day: dipDay,
        completion_rate: ft.data.completion_rate,
        completion_rate_pct: Math.round((ft.data.completion_rate as number) * 100),
      },
      confidence: Math.min(dip.confidence, ft.confidence) * 0.9,
    });
  }

  // Combo 2: Engagement gap + negative follow-through
  // "When you go quiet, plans also tend to stall"
  const gap = typeMap.get("engagement_gap");
  if (gap && ft && (ft.data.completion_rate as number) < 0.5) {
    combos.push({
      type: "combo_gap_followthrough",
      category: "behavioral",
      data: {
        observation: `When you go quiet (like the last ${gap.data.current_gap_days} days), plans tend to stall too — only ${Math.round((ft.data.completion_rate as number) * 100)}% completion.`,
        current_gap_days: gap.data.current_gap_days,
        completion_rate: ft.data.completion_rate,
        completion_rate_pct: Math.round((ft.data.completion_rate as number) * 100),
      },
      confidence: Math.min(gap.confidence, ft.confidence) * 0.85,
    });
  }

  // Combo 3: Positive reinforcement + pre-event (momentum into event)
  // "You're on a streak AND have something coming up — great timing"
  const pos = typeMap.get("positive_reinforcement");
  const pre = typeMap.get("pre_event");
  if (pos && pre && (pos.data.current_streak as number) >= 3) {
    combos.push({
      type: "combo_momentum_event",
      category: "emotional",
      data: {
        observation: `${pos.data.current_streak}-day streak heading into "${pre.data.plan_title}" — you're carrying momentum into this.`,
        current_streak: pos.data.current_streak,
        plan_title: pre.data.plan_title,
      },
      confidence: Math.min(pos.confidence, pre.confidence) * 0.9,
    });
  }

  // Combo 4: Energy dip + engagement gap (compounding disengagement)
  if (dip && gap) {
    const dipDay = dip.data.dip_day as string;
    const today = new Date();
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayName = dayNames[today.getUTCDay()];
    if (todayName === dipDay) {
      combos.push({
        type: "combo_dip_gap",
        category: "engagement",
        data: {
          observation: `It's ${capitalize(dipDay)} — your quietest day — and you've already been off-grid for ${gap.data.current_gap_days} days. Just checking in.`,
          dip_day: dipDay,
          current_gap_days: gap.data.current_gap_days,
        },
        confidence: Math.min(dip.confidence, gap.confidence) * 0.85,
      });
    }
  }

  // Filter combos below minimum confidence
  return combos.filter((c) => c.confidence >= MIN_CONFIDENCE);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── 1. Energy Dip Pattern ──
// Detects consistent low-activity periods by day of week
async function detectEnergyDipPattern(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern | null> {
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  
  const { data: usage } = await sb
    .from("usage_tracking")
    .select("usage_date, messages_sent, think_freely_messages")
    .eq("user_id", userId)
    .gte("usage_date", fourWeeksAgo)
    .order("usage_date", { ascending: true });

  if (!usage || usage.length < MIN_DATA_POINTS) return null;

  // Group by day of week
  const dayBuckets: Record<string, number[]> = {};
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (const row of usage) {
    const d = new Date(row.usage_date + "T12:00:00Z");
    const dayName = dayNames[d.getUTCDay()];
    if (!dayBuckets[dayName]) dayBuckets[dayName] = [];
    dayBuckets[dayName].push((row.messages_sent || 0) + (row.think_freely_messages || 0));
  }

  // Calculate overall average
  const allValues = Object.values(dayBuckets).flat();
  const overallAvg = allValues.reduce((s, v) => s + v, 0) / allValues.length;
  if (overallAvg === 0) return null;

  // Find the day with the lowest average engagement
  let lowestDay = "";
  let lowestAvg = Infinity;
  let lowestSampleSize = 0;

  for (const [day, values] of Object.entries(dayBuckets)) {
    if (values.length < 3) continue; // Need at least 3 occurrences
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    if (avg < lowestAvg) {
      lowestAvg = avg;
      lowestDay = day;
      lowestSampleSize = values.length;
    }
  }

  if (!lowestDay || lowestSampleSize < 3) return null;

  // Is the dip significant? (at least 40% below average)
  const dipRatio = lowestAvg / overallAvg;
  if (dipRatio > 0.6) return null;

  const confidence = Math.min(0.95, 0.6 + (lowestSampleSize / 20) + ((1 - dipRatio) * 0.3));

  if (confidence < MIN_CONFIDENCE) return null;

  return {
    type: "energy_dip",
    category: "engagement",
    data: {
      observation: `${lowestDay.charAt(0).toUpperCase() + lowestDay.slice(1)}s tend to be quieter — engagement drops about ${Math.round((1 - dipRatio) * 100)}% compared to other days.`,
      dip_day: lowestDay,
      dip_avg: Math.round(lowestAvg * 10) / 10,
      overall_avg: Math.round(overallAvg * 10) / 10,
      sample_size: lowestSampleSize,
    },
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ── 2. Engagement Gap Pattern ──
// Detects when user goes unusually silent
async function detectEngagementGapPattern(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern | null> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);

  const { data: usage } = await sb
    .from("usage_tracking")
    .select("usage_date")
    .eq("user_id", userId)
    .gte("usage_date", sixtyDaysAgo)
    .order("usage_date", { ascending: true });

  if (!usage || usage.length < MIN_DATA_POINTS) return null;

  // Calculate gaps between active days
  const activeDates = usage.map((r: any) => new Date(r.usage_date + "T12:00:00Z").getTime());
  const gaps: number[] = [];

  for (let i = 1; i < activeDates.length; i++) {
    const gapDays = Math.round((activeDates[i] - activeDates[i - 1]) / 86400000);
    if (gapDays > 1) gaps.push(gapDays);
  }

  if (gaps.length < 2) return null;

  // Check current gap (days since last activity)
  const lastActive = activeDates[activeDates.length - 1];
  const currentGapDays = Math.round((Date.now() - lastActive) / 86400000);

  const avgGap = gaps.reduce((s, v) => s + v, 0) / gaps.length;
  const maxGap = Math.max(...gaps);

  // Only flag if there's a current gap exceeding 2x average
  if (currentGapDays <= Math.max(avgGap * 1.5, 2)) return null;

  const confidence = Math.min(0.95, 0.7 + (currentGapDays / (avgGap * 4)) * 0.25);

  if (confidence < MIN_CONFIDENCE) return null;

  return {
    type: "engagement_gap",
    category: "engagement",
    data: {
      observation: `Has been quiet for ${currentGapDays} days — typical gap is about ${Math.round(avgGap)} days.`,
      current_gap_days: currentGapDays,
      avg_gap_days: Math.round(avgGap * 10) / 10,
      longest_gap_days: maxGap,
      sample_size: gaps.length,
    },
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ── 3. Pre-Event Context Pattern ──
// Detects upcoming plans that matter
async function detectPreEventPattern(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern | null> {
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const threeDaysOut = new Date(Date.now() + 3 * 86400000).toISOString();

  const { data: upcomingPlans } = await sb
    .from("companion_plans")
    .select("title, emoji, schedule, companion_note, category")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_rhythm", false)
    .limit(5);

  if (!upcomingPlans || upcomingPlans.length === 0) return null;

  // Find plans with scheduled dates in the next 1-3 days
  const soonPlans = upcomingPlans.filter((p: any) => {
    if (!p.schedule) return false;
    const sched = typeof p.schedule === 'string' ? JSON.parse(p.schedule) : p.schedule;
    const dueDate = sched?.due_date || sched?.date || sched?.deadline;
    if (!dueDate) return false;
    const due = new Date(dueDate).getTime();
    return due >= Date.now() && due <= new Date(threeDaysOut).getTime();
  });

  if (soonPlans.length === 0) return null;

  const plan = soonPlans[0];
  const sched = typeof plan.schedule === 'string' ? JSON.parse(plan.schedule) : plan.schedule;
  const dueDate = sched?.due_date || sched?.date || sched?.deadline;

  return {
    type: "pre_event",
    category: "behavioral",
    data: {
      observation: `Has "${plan.title}" coming up${dueDate ? ` on ${new Date(dueDate).toLocaleDateString()}` : ' soon'}.`,
      plan_title: plan.title,
      plan_emoji: plan.emoji,
      plan_category: plan.category,
      companion_note: plan.companion_note,
      due_date: dueDate,
    },
    confidence: 0.95, // High confidence — it's a concrete scheduled item
  };
}

// ── 4. Follow-Through Pattern ──
// Detects completion rate patterns
async function detectFollowThroughPattern(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern | null> {
  const { data: plans } = await sb
    .from("companion_plans")
    .select("status, completed_at, missed_at, is_rhythm, category")
    .eq("user_id", userId)
    .eq("is_rhythm", false)
    .limit(50);

  if (!plans || plans.length < MIN_DATA_POINTS) return null;

  const completed = plans.filter((p: any) => p.status === "completed").length;
  const missed = plans.filter((p: any) => p.status === "missed" || p.missed_at).length;
  const total = plans.length;
  const completionRate = completed / total;

  // Detect category-specific patterns
  const categoryStats: Record<string, { completed: number; total: number }> = {};
  for (const p of plans) {
    const cat = (p as any).category || "general";
    if (!categoryStats[cat]) categoryStats[cat] = { completed: 0, total: 0 };
    categoryStats[cat].total++;
    if ((p as any).status === "completed") categoryStats[cat].completed++;
  }

  // Find weakest category (if any has enough data)
  let weakestCategory = "";
  let weakestRate = 1;
  for (const [cat, stats] of Object.entries(categoryStats)) {
    if (stats.total < 3) continue;
    const rate = stats.completed / stats.total;
    if (rate < weakestRate) {
      weakestRate = rate;
      weakestCategory = cat;
    }
  }

  const confidence = Math.min(0.95, 0.65 + (total / 30) * 0.3);
  if (confidence < MIN_CONFIDENCE) return null;

  const observation = completionRate >= 0.7
    ? `Follows through on ${Math.round(completionRate * 100)}% of plans — strong consistency.`
    : completionRate >= 0.4
    ? `Completes about ${Math.round(completionRate * 100)}% of plans${weakestCategory && weakestRate < 0.4 ? ` — ${weakestCategory} plans tend to fall off` : ""}.`
    : `Tends to start plans but follow-through drops off — only ${Math.round(completionRate * 100)}% completion${weakestCategory ? ` (especially in ${weakestCategory})` : ""}.`;

  return {
    type: "follow_through",
    category: "behavioral",
    data: {
      observation,
      completion_rate: Math.round(completionRate * 100) / 100,
      completed_count: completed,
      missed_count: missed,
      total_plans: total,
      weakest_category: weakestCategory || null,
      weakest_rate: weakestCategory ? Math.round(weakestRate * 100) / 100 : null,
      sample_size: total,
    },
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ── 5. Positive Reinforcement Pattern ──
// Detects consistency improvements, streaks, milestones
async function detectPositiveReinforcementPattern(
  sb: ReturnType<typeof createClient>,
  userId: string
): Promise<DetectedPattern | null> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [recentUsage, olderUsage, milestones] = await Promise.all([
    sb
      .from("usage_tracking")
      .select("usage_date")
      .eq("user_id", userId)
      .gte("usage_date", fourteenDaysAgo)
      .order("usage_date"),
    sb
      .from("usage_tracking")
      .select("usage_date")
      .eq("user_id", userId)
      .gte("usage_date", thirtyDaysAgo)
      .lt("usage_date", fourteenDaysAgo)
      .order("usage_date"),
    sb
      .from("companion_milestones")
      .select("milestone_type, achieved_at")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false })
      .limit(5),
  ]);

  const recentDays = recentUsage.data?.length || 0;
  const olderDays = olderUsage.data?.length || 0;

  if (recentDays < 3 && olderDays < 3) return null;

  // Compare recent 14 days vs previous 14 days
  const recentRate = recentDays / 14;
  const olderRate = olderDays / 14;
  const improvement = recentRate - olderRate;

  // Calculate current streak
  let streak = 0;
  if (recentUsage.data && recentUsage.data.length > 0) {
    const today = new Date().toISOString().slice(0, 10);
    const dates = recentUsage.data.map((r: any) => r.usage_date).sort().reverse();
    
    let checkDate = today;
    for (const date of dates) {
      if (date === checkDate) {
        streak++;
        const prev = new Date(checkDate + "T12:00:00Z");
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().slice(0, 10);
      }
    }
  }

  // Recent milestones
  const recentMilestones = milestones.data?.filter((m: any) => {
    const achievedAt = new Date(m.achieved_at).getTime();
    return achievedAt > Date.now() - 14 * 86400000;
  }) || [];

  // Build observation
  let observation = "";
  if (streak >= 5) {
    observation = `On a ${streak}-day activity streak — showing up consistently.`;
  } else if (improvement >= 0.2) {
    observation = `More active the last two weeks compared to before — engagement is trending up.`;
  } else if (recentMilestones.length > 0) {
    observation = `Recently hit ${recentMilestones.length} milestone${recentMilestones.length > 1 ? "s" : ""} — making real progress.`;
  } else {
    return null; // No positive pattern to surface
  }

  const confidence = Math.min(0.95, 0.7 + (recentDays / 14) * 0.25);
  if (confidence < MIN_CONFIDENCE) return null;

  return {
    type: "positive_reinforcement",
    category: "emotional",
    data: {
      observation,
      current_streak: streak,
      recent_active_days: recentDays,
      previous_active_days: olderDays,
      improvement_rate: Math.round(improvement * 100) / 100,
      recent_milestones: recentMilestones.length,
      sample_size: recentDays + olderDays,
    },
    confidence: Math.round(confidence * 100) / 100,
  };
}
