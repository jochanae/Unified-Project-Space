import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract Plans — called after chat messages to detect structured plans,
 * recommendations, routines, and accountability items from companion conversations.
 *
 * Detects things like:
 * - workout/meal/study plans
 * - daily routines & schedules
 * - medication reminders with structure
 * - companion recommendations ("I think you should try...")
 * - accountability commitments with steps
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await authSb.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, memberId, companionName, recentMessages, connectionMode, matureMode } = await req.json();

    if (!userId || !memberId || !recentMessages || recentMessages.length === 0) {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip plan extraction when mature/flame toggle is active (intimate content, not actionable plans)
    if (matureMode) {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const messagesToAnalyze = recentMessages.slice(-6);
    const conversationText = messagesToAnalyze
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You extract structured plans, routines, and recommendations from conversations between a user and their AI companion.

ONLY extract a plan when the companion EXPLICITLY structures one — meaning the companion clearly presents an organized plan, routine, schedule, or step-by-step guide that the user can follow. Look for:
- Workout plans, meal plans, study schedules the companion explicitly laid out
- Daily/weekly routines the companion formally proposed with structure
- Medication schedules or health plans with concrete times/steps
- Step-by-step guides the companion structured as numbered or ordered items
- Accountability plans the companion explicitly framed as a commitment

DO NOT extract plans from:
- Casual mentions of topics (e.g. user says "I was fixing bugs all day" → NOT a plan)
- The companion giving general advice without structure (e.g. "you should try to relax more")
- Conversations ABOUT plans/work/routines without the companion drafting one
- Knowledge vault content, work rules, or reference material being discussed
- Roleplay, intimate scenes, mood descriptions, or casual feelings
- Vague or abstract ideas like "embrace midnight energy" or "acknowledge a feeling"

The companion must have ACTIVELY DRAFTED the plan in the conversation — not just mentioned a topic that could be a plan.

Classify each extracted plan as:
- reminder: has a scheduled time (e.g. "every day at 8am") — set plan_type to "reminder"
- guidance: no scheduled time but has clear ordered steps — set plan_type to "guidance" and populate steps array

Return AT MOST 2 plans per conversation. If no clear explicitly-structured plans exist, return an empty array. Pick an appropriate emoji for each plan category.

When a guidance plan clearly belongs to a recurring life theme, assign the most fitting playbook_theme. Reminder plans should not have a playbook theme.`,
          },
          { role: "user", content: conversationText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_plans",
              description: "Save extracted plans and recommendations",
              parameters: {
                type: "object",
                properties: {
                  plans: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description: "Short plan title (e.g. 'Morning Workout Routine', 'Medication Schedule')",
                        },
                        description: {
                          type: "string",
                          description: "Brief description of the plan with key steps or details",
                        },
                        category: {
                          type: "string",
                          enum: [
                            "workout",
                            "meal",
                            "study",
                            "medication",
                            "appointment",
                            "routine",
                            "wellness",
                            "accountability",
                            "general",
                          ],
                          description: "Category of the plan",
                        },
                        emoji: {
                          type: "string",
                          description: "Single emoji representing this plan (e.g. 💪, 🍎, 📖, 💊, 🩺)",
                        },
                        schedule: {
                          type: "object",
                          properties: {
                            time: { type: "string", description: "Time if specified (HH:MM)" },
                            days: {
                              type: "array",
                              items: { type: "string" },
                              description: "Days of week if specified",
                            },
                            frequency: {
                              type: "string",
                              description: "e.g. 'daily', 'weekly', 'every other day'",
                            },
                          },
                          additionalProperties: false,
                        },
                        plan_type: {
                          type: "string",
                          enum: ["reminder", "guidance"],
                          description: "reminder = has scheduled time; guidance = no time but has steps/advice",
                        },
                        steps: {
                          type: "array",
                          items: { type: "string" },
                          description: "Ordered array of step strings for guidance plans",
                        },
                        playbook_theme: {
                          type: "string",
                          description: "A short snake_case theme label grouping related plans together. Use this when the plan belongs to a recognizable life area. Examples: 'flight-attendant', 'bible-study', 'morning-routine', 'fitness', 'mental-health', 'parenting', 'career'. Leave null if no clear theme applies.",
                        },
                        checklist_reset: {
                          type: "string",
                          enum: ["daily", "weekly"],
                          description: "Set to 'daily' for routines that repeat each day (morning routine, daily habits). Set to 'weekly' for weekly checklists. Leave null/omit for one-time plans.",
                        },
                      },
                      required: ["title", "description", "category", "emoji"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["plans"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_plans" } },
      }),
    });

    if (!aiResp.ok) {
      console.error(`[ExtractPlans] AI error: ${aiResp.status}`);
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { plans: any[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.plans || parsed.plans.length === 0) {
      return new Response(JSON.stringify({ extracted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch self-dedup: remove semantic duplicates within this response, cap at 2
    const dedupedPlans: any[] = [];
    for (const p of parsed.plans) {
      if (!p.title || p.title.length < 3) continue;
      const isDupe = dedupedPlans.some(existing =>
        existing.title.slice(0, 15).toLowerCase() === p.title.slice(0, 15).toLowerCase()
      );
      if (!isDupe) dedupedPlans.push(p);
      if (dedupedPlans.length >= 2) break; // hard cap of 2 per invocation
    }

    let savedCount = 0;
    for (const p of dedupedPlans) {

      // Broader DB dedup: check title fragment AND description similarity
      const { data: existing } = await supabase
        .from("companion_plans")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["active", "suggested"])
        .ilike("title", `%${p.title.slice(0, 15)}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      // Determine plan_type: reminder if has scheduled time, else guidance
      const hasScheduledTime = !!(p.schedule?.time || (p.schedule?.days && p.schedule.days.length > 0) || p.schedule?.frequency);
      const planType = p.plan_type === "guidance" || (!hasScheduledTime && Array.isArray(p.steps) && p.steps.length > 0)
        ? "guidance"
        : "reminder";
      const steps = Array.isArray(p.steps) && p.steps.every((s: unknown) => typeof s === "string")
        ? p.steps
        : planType === "guidance" && p.description
          ? [p.description]
          : [];

      const { error } = await supabase.from("companion_plans").insert({
        user_id: userId,
        member_id: memberId,
        companion_name: companionName || "Your companion",
        title: p.title.slice(0, 100),
        description: (p.description || "").slice(0, 500),
        category: p.category || "general",
        emoji: p.emoji || "📋",
        schedule: p.schedule || {},
        plan_type: planType,
        steps: steps,
        playbook_theme: p.playbook_theme || null,
        checklist_reset: p.checklist_reset || null,
        source: connectionMode === 'mentor' ? 'mentor' : connectionMode === 'romantic' ? 'romantic' : 'companion',
        companion_note: connectionMode ? `Suggested in ${connectionMode} mode` : null,
        status: "suggested",
      });

      if (!error) savedCount++;
    }

    console.log(`[ExtractPlans] Saved ${savedCount} plans for user ${userId}`);

    return new Response(JSON.stringify({ extracted: savedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ExtractPlans] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
