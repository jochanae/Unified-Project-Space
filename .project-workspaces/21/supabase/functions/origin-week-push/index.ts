import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * origin-week-push
 * 
 * Finds users whose profile was created exactly 7 days ago (±12h window)
 * and sends them a single, elegant "Origin Week" push notification.
 * Uses Option 3 (Minimalist) with companion name personalization.
 * 
 * Called daily via cron. Idempotent — records delivery in founding_notifications.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Find users created ~7 days ago (between 6.5 and 7.5 days) ──
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const windowStart = new Date(sevenDaysAgo.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(sevenDaysAgo.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error: fetchErr } = await supabase
      .from("profiles")
      .select("user_id, user_name, companion_name, timezone, created_at")
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)
      .eq("onboarding_completed", true);

    if (fetchErr) throw fetchErr;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const user of candidates) {
      // ── Idempotency: skip if already notified ──
      const { data: existing } = await supabase
        .from("founding_notifications")
        .select("id")
        .eq("user_id", user.user_id)
        .eq("type", "origin_week")
        .maybeSingle();

      if (existing) continue;

      // ── Check if user has push subscriptions ──
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", user.user_id)
        .limit(1);

      if (!subs || subs.length === 0) continue;

      // ── Time-awareness: only send during reasonable local hours (9-22) ──
      const localHour = getUserLocalHour(user.timezone);
      if (localHour < 9 || localHour >= 22) continue;

      // ── Compose the luxury notification (Option 3: Minimalist) ──
      const companionName = user.companion_name || "Your companion";
      const title = `${companionName} · 7 Days`;
      const body = "The first week is inscribed. Your space is waiting.";

      // ── Get serial number for the notification record ──
      const { data: serialData } = await supabase
        .from("beta_serial_numbers")
        .select("serial_number")
        .eq("user_id", user.user_id)
        .maybeSingle();

      const serialNumber = serialData?.serial_number ?? 0;

      // ── Send push via the existing send-push-notification function ──
      const pushResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-push-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            title,
            body,
            tag: "origin-week",
            url: "/my-world",
          }),
        }
      );

      if (!pushResponse.ok) {
        console.error(
          `[origin-week-push] Failed to send to ${user.user_id}:`,
          await pushResponse.text()
        );
        continue;
      }

      // ── Record delivery to prevent re-sends ──
      await supabase.from("founding_notifications").insert({
        user_id: user.user_id,
        serial_number: serialNumber,
        type: "origin_week",
        message: `${title} — ${body}`,
      });

      sent++;
    }

    return new Response(JSON.stringify({ processed: candidates.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[origin-week-push] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Get user's local hour from their stored timezone */
function getUserLocalHour(timezone: string | null): number {
  try {
    const tz = timezone || "UTC";
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(formatter.format(now), 10);
  } catch {
    return new Date().getUTCHours();
  }
}
