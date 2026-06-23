import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── JWT Authentication ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // ── Rate limit: max 1 ICE alert per user per 24 hours ──
    const serviceSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: allowed } = await serviceSb.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "ice-alert",
      p_max_requests: 1,
      p_window_minutes: 1440, // 24 hours
    });

    if (allowed === false) {
      return new Response(
        JSON.stringify({ sent: 0, message: "ICE alert already sent in the last 24 hours" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get user profile for name ──
    const { data: profile } = await serviceSb
      .from("profiles")
      .select("user_name, companion_name")
      .eq("user_id", userId)
      .single();

    const userName = profile?.user_name || "Someone";
    const companionName = profile?.companion_name || "their companion";

    // ── Get ICE contacts with notify_on_crisis = true ──
    const { data: contacts } = await serviceSb
      .from("ice_contacts_decrypted")
      .select("id, name, phone_number_decrypted, relationship, notify_on_crisis")
      .eq("user_id", userId)
      .eq("notify_on_crisis", true);

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No ICE contacts with crisis alerts enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send SMS to each contact ──
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioSid || !twilioAuth || !twilioFrom) {
      console.error("Twilio credentials not configured for ICE alerts");
      return new Response(
        JSON.stringify({ sent: 0, error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sentCount = 0;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const credentials = btoa(`${twilioSid}:${twilioAuth}`);

    for (const contact of contacts) {
      const phone = contact.phone_number_decrypted;
      if (!phone) continue;

      const smsBody = `Hi ${contact.name}, ${userName} may need some extra support right now. This is an automated message from Compani, their wellness companion. Consider reaching out to them. 💛`;

      try {
        const body = new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: smsBody,
        });

        const resp = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (resp.ok) {
          sentCount++;
        } else {
          const err = await resp.json();
          console.error(`Failed to send ICE SMS to ${contact.name}:`, err);
        }
      } catch (e) {
        console.error(`ICE SMS error for ${contact.name}:`, e);
      }
    }

    // ── Log notification so user can see it was sent ──
    if (sentCount > 0) {
      await serviceSb.from("notifications").insert({
        user_id: userId,
        type: "ice_alert",
        message: `Emergency contacts notified (${sentCount} sent). Your trusted contacts received a brief message that you may need support.`,
        metadata: { sent_count: sentCount, contacts: contacts.map((c: any) => c.name) },
      });
    }

    return new Response(
      JSON.stringify({ sent: sentCount, message: `${sentCount} ICE contact(s) notified` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ICE alert error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
