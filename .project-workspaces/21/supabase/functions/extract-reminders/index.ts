import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Extract Reminders — called after chat messages to detect commitments/reminders
 * AND cancellation/postponement intent.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authSb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, memberId, companionName, recentMessages } = await req.json();

    if (!userId || !memberId || !recentMessages || recentMessages.length === 0) {
      return new Response(JSON.stringify({ extracted: 0, cancelled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch existing active reminders for this user so the AI can:
    // 1) Avoid creating duplicates
    // 2) Identify reminders to cancel/pause
    const { data: existingReminders } = await supabase
      .from("reminders")
      .select("id, reminder_text, remind_at, days_of_week")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(30);

    const existingList = (existingReminders || []).map((r: any) =>
      `[ID: ${r.id}] "${r.reminder_text}" at ${r.remind_at} on ${(r.days_of_week || []).join(', ')}`
    ).join('\n');

    // Only analyze the last 4 messages for efficiency
    const messagesToAnalyze = recentMessages.slice(-4);
    const conversationText = messagesToAnalyze
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You extract reminders and detect cancellation/postponement intent from conversations.

## EXISTING ACTIVE REMINDERS FOR THIS USER:
${existingList || '(none)'}

## CREATING REMINDERS
Look for explicit or implicit requests like:
- "remind me to..." / "can you remind me..."
- "hold me accountable for..." / "help me stay on track with..."
- "I want to start [doing X] at [time]"
- "check in on me about..."
- "I need to [do X] every [day/morning/evening]"
- "wake me up at..." / "nudge me about..."

Also extract proactive companion suggestions like:
- "Let's practice again tomorrow at 7pm"
- "I'll remind you to review your vocab tonight"

CRITICAL DEDUP RULE: Before creating a new reminder, check the EXISTING ACTIVE REMINDERS list above.
If a new reminder covers the same topic/task as an existing one (even with different wording), DO NOT create it.
For example, "Go over EMV scenarios" and "Review EMV scenarios and responses" are the SAME topic — skip the duplicate.

For language lessons: write the reminder text in the language being taught when natural.

Time parsing rules:
- Preserve the exact requested hour (e.g. "11 pm" => "23:00", "9 pm" => "21:00")
- "12 am" => "00:00", "12 pm" => "12:00"
- If the user gives no time, use "09:00"

Only extract CLEAR commitments. Do NOT extract vague wishes or casual mentions.

## CANCELLING/PAUSING REMINDERS
Look for phrases that indicate the user wants to stop, delay, or pause reminders:
- "stop reminding me about..." / "cancel that reminder"
- "I'm not going to worry about X until [date]"
- "I'll deal with it [later/Tuesday/next week]"
- "don't check in about X"
- "pause reminders" / "no more nudges about..."
- "I'll review everything on [day]" (implies: don't send individual topic reminders before then)

When you detect cancellation intent, match it to the EXISTING ACTIVE REMINDERS above and return their IDs.
If the user says something general like "I'll handle all of it on Tuesday," cancel ALL related reminders.

If no reminders to create and none to cancel, return empty arrays for both tools.`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conversationText },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_reminders",
              description: "Save NEW reminders that don't duplicate existing ones",
              parameters: {
                type: "object",
                properties: {
                  reminders: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        reminder_text: {
                          type: "string",
                          description: "What to remind them about, phrased as an encouragement",
                        },
                        remind_at: {
                          type: "string",
                          description: "Time in HH:MM 24-hour format. Default to '09:00' if no time specified.",
                        },
                        days_of_week: {
                          type: "array",
                          items: { type: "string" },
                          description: "Days to send reminder. Full names: Monday, Tuesday, etc.",
                        },
                      },
                      required: ["reminder_text", "remind_at", "days_of_week"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["reminders"],
                additionalProperties: false,
              },
            },
          },
          {
            type: "function",
            function: {
              name: "cancel_reminders",
              description: "Deactivate existing reminders the user wants to stop, delay, or pause",
              parameters: {
                type: "object",
                properties: {
                  reminder_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "IDs of existing reminders to deactivate",
                  },
                  reason: {
                    type: "string",
                    description: "Brief reason for cancellation (e.g. 'user postponed to Tuesday')",
                  },
                },
                required: ["reminder_ids"],
                additionalProperties: false,
              },
            },
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      console.error(`[ExtractReminders] AI error: ${aiResp.status}`);
      return new Response(JSON.stringify({ extracted: 0, cancelled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCalls = aiData.choices?.[0]?.message?.tool_calls || [];

    let savedCount = 0;
    let cancelledCount = 0;

    for (const toolCall of toolCalls) {
      let parsed: any;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        continue;
      }

      // Handle save_reminders
      if (toolCall.function.name === "save_reminders" && parsed.reminders) {
        for (const r of parsed.reminders) {
          // Validate time format
          const timeMatch = r.remind_at?.match(/^(\d{2}):(\d{2})$/);
          if (!timeMatch) continue;
          const hour = parseInt(timeMatch[1]);
          const minute = parseInt(timeMatch[2]);
          if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

          // Validate days
          const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          const days = (r.days_of_week || validDays).filter((d: string) => validDays.includes(d));
          if (days.length === 0) continue;

          // Secondary dedup: check DB as a safety net (broader match — 20 chars)
          const { data: existing } = await supabase
            .from("reminders")
            .select("id")
            .eq("user_id", userId)
            .eq("active", true)
            .ilike("reminder_text", `%${r.reminder_text.slice(0, 20)}%`)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from("reminders").insert({
            user_id: userId,
            member_id: memberId,
            companion_name: companionName || "Your companion",
            reminder_text: r.reminder_text.slice(0, 200),
            remind_at: `${r.remind_at}:00`,
            days_of_week: days,
          });

          if (!error) savedCount++;
        }
      }

      // Handle cancel_reminders
      if (toolCall.function.name === "cancel_reminders" && parsed.reminder_ids) {
        const validIds = (existingReminders || []).map((r: any) => r.id);
        for (const id of parsed.reminder_ids) {
          // Only cancel IDs that actually belong to this user's active reminders
          if (!validIds.includes(id)) continue;

          const { error } = await supabase
            .from("reminders")
            .update({ active: false })
            .eq("id", id)
            .eq("user_id", userId);

          if (!error) cancelledCount++;
        }
        if (cancelledCount > 0) {
          console.log(`[ExtractReminders] Cancelled ${cancelledCount} reminders for user ${userId}. Reason: ${parsed.reason || 'user request'}`);
        }
      }
    }

    console.log(`[ExtractReminders] Saved ${savedCount}, cancelled ${cancelledCount} for user ${userId}`);

    return new Response(JSON.stringify({ extracted: savedCount, cancelled: cancelledCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ExtractReminders] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
