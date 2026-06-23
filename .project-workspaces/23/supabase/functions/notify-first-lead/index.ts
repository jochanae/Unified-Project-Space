import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_notification_id } = await req.json();
    if (!lead_notification_id) {
      return new Response(JSON.stringify({ error: "Missing lead_notification_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load the lead notification
    const { data: lead, error: leadErr } = await supabase
      .from("lead_notifications")
      .select("id, email, source, org_id, project_id, page_id")
      .eq("id", lead_notification_id)
      .maybeSingle();
    if (leadErr) throw leadErr;
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find org owners/users to notify
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id, email, display_name")
      .eq("org_id", lead.org_id);

    const recipients = orgUsers ?? [];

    // ---- 1. Resend email ----
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailResult: unknown = null;
    if (resendKey && recipients.length > 0) {
      const subject = `🎯 New lead: ${lead.email}`;
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;max-width:560px;margin:0 auto">
          <p style="font-size:11px;letter-spacing:0.2em;color:#5eead4;text-transform:uppercase;margin:0">IntoIQ · New Lead</p>
          <h1 style="font-size:24px;margin:8px 0 16px;font-weight:600">${lead.email} just opted in</h1>
          <p style="color:#a1a1aa;margin:0 0 24px">Source: ${lead.source.replace("_", " ")}</p>
          <a href="https://intoiq.app/dashboard" style="display:inline-block;background:#5eead4;color:#0a0a0a;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open Dashboard</a>
          <p style="color:#52525b;font-size:12px;margin:24px 0 0">MarQ is preparing a contextual follow-up script.</p>
        </div>`;

      const toList = recipients.map((u) => u.email).filter(Boolean);
      try {
        const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "IntoIQ <onboarding@resend.dev>",
            to: toList,
            subject,
            html,
          }),
        });
        emailResult = await resp.json();
      } catch (e) {
        console.error("Resend error:", e);
      }
    }

    // ---- 2. Web Push ----
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@intoiq.app";

    let pushSent = 0;
    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("org_id", lead.org_id);

      const payload = JSON.stringify({
        title: "🎯 New lead captured",
        body: `${lead.email} just opted in`,
        url: "/dashboard",
        tag: `lead-${lead.id}`,
      });

      for (const sub of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          pushSent++;
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        } catch (err: any) {
          console.error("Push error:", err?.statusCode, err?.body);
          // 410 = gone → cleanup
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, push_sent: pushSent, email: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("notify-first-lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
