import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getYesterdayWeekday(timezone: string | null): string {
  try {
    const tz = timezone || "UTC";
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
    });
    return formatter.format(yesterday);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return WEEKDAYS[d.getUTCDay()];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Daily reset: clear rhythm_completed_today for stale rhythms ──
    const todayISO = new Date().toISOString().slice(0, 10);
    const { data: staleRhythms } = await supabase
      .from("companion_plans")
      .select("id")
      .eq("status", "active")
      .eq("is_rhythm", true)
      .eq("rhythm_completed_today", true)
      .neq("rhythm_last_completed", todayISO);

    if (staleRhythms && staleRhythms.length > 0) {
      const staleIds = staleRhythms.map((r: any) => r.id);
      const { error: resetErr } = await supabase
        .from("companion_plans")
        .update({ rhythm_completed_today: false })
        .in("id", staleIds);

      if (!resetErr) {
        console.log(`Reset rhythm_completed_today for ${staleIds.length} rhythms`);
      }
    }

    // ── Flag missed plans per user ──
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, timezone")
      .not("user_id", "is", null);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ flagged: 0, reset: staleRhythms?.length ?? 0, message: "No profiles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let flaggedCount = 0;
    const now = new Date().toISOString();

    for (const profile of profiles) {
      const userId = profile.user_id;
      const tz = profile.timezone || "UTC";
      const yesterdayWeekday = getYesterdayWeekday(tz);

      // Fetch active plans with schedule.time (scheduled plans)
      const { data: plans, error } = await supabase
        .from("companion_plans")
        .select("id, schedule, completed_at, member_id, companion_name, title, missed_checkin_sent")
        .eq("user_id", userId)
        .eq("status", "active");

      if (error || !plans) continue;

      for (const plan of plans) {
        const schedule = (plan.schedule as Record<string, unknown>) || {};
        const scheduleTime = schedule.time as string | undefined;
        if (!scheduleTime) continue; // Only plans with a scheduled time

        const days = schedule.days as string[] | undefined;
        const frequency = (schedule.frequency as string) || "";

        // Check if plan was due yesterday
        const isDaily = /daily|every day|each day/i.test(frequency);
        const daysList = Array.isArray(days) ? days : [];
        const dueYesterday =
          isDaily ||
          daysList.length === 0 ||
          daysList.some((d) => d.toLowerCase() === yesterdayWeekday.toLowerCase());

        if (!dueYesterday) continue;

        // Check if not completed yesterday (null = never completed; or completed on different day)
        const completedAt = plan.completed_at;
        let wasCompletedYesterday = false;
        if (completedAt) {
          try {
            const completed = new Date(completedAt);
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: tz,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            wasCompletedYesterday =
              formatter.format(completed) === formatter.format(yesterday);
          } catch {
            wasCompletedYesterday = false;
          }
        }

        if (!wasCompletedYesterday) {
          const { error: updateErr } = await supabase
            .from("companion_plans")
            .update({ missed_at: now })
            .eq("id", plan.id)
            .eq("user_id", userId);

          if (!updateErr) {
            flaggedCount++;
            console.log(`Flagged missed plan ${plan.id} for user ${userId}`);

            // Inject companion check-in message if conditions met
            const memberId = plan.member_id || (plan as any).memberId;
            const companionName = plan.companion_name || "Your companion";
            const missedCheckinSent = plan.missed_checkin_sent === true;

            if (memberId && memberId !== "user" && !missedCheckinSent) {
              // Limit to 1 missed check-in per user per day
              const todayStart = todayISO + "T00:00:00.000Z";
              const { count } = await supabase
                .from("chat_messages")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .eq("source", "missed-plan-checkin")
                .gte("created_at", todayStart);

              if (count !== null && count < 1) {
                const { error: insertErr } = await supabase
                  .from("chat_messages")
                  .insert({
                    user_id: userId,
                    member_id: memberId,
                    content: `[System: ${companionName} noticed you had "${plan.title}" scheduled. Check in gently — ask if they still want to work on it or if life got in the way. Be warm, not guilt-inducing. 1-2 sentences only.]`,
                    role: "assistant",
                    source: "missed-plan-checkin",
                  });

                if (!insertErr) {
                  await supabase
                    .from("companion_plans")
                    .update({ missed_checkin_sent: true })
                    .eq("id", plan.id);
                  console.log(`Sent missed check-in message for plan ${plan.id}`);
                }
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ flagged: flaggedCount, reset: staleRhythms?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("flag-missed-plans error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
