// Public RSVP submission endpoint for a Living Flyer / Social Funnel.
// Routes the lead into the funnel OWNER'S CRM (org-scoped, closed-loop).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RsvpBody {
  share_token?: string;
  name?: string;
  phone?: string;
  email?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = (await req.json()) as RsvpBody;
    const token = body.share_token?.trim();
    const name = (body.name || "").trim().slice(0, 120);
    const phone = (body.phone || "").trim().slice(0, 40);
    const email = (body.email || "").trim().toLowerCase().slice(0, 160);

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing share_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name && !phone && !email) {
      return new Response(JSON.stringify({ error: "At least one field is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Look up the funnel by share_token → owner org
    const { data: funnel, error: funnelError } = await supabase
      .from("marketing_assets")
      .select("id, org_id, project_id, title, config")
      .eq("share_token", token)
      .maybeSingle();
    if (funnelError) throw funnelError;
    if (!funnel) {
      return new Response(JSON.stringify({ error: "Funnel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = (funnel.config || {}) as Record<string, unknown>;
    const sourceTag = typeof cfg.source_tag === "string" ? cfg.source_tag : null;

    // 2. Resolve / upsert contact in the OWNER'S org.
    //    Identity key: email if provided, else phone, else create a new fingerprint.
    const [firstName, ...rest] = name.split(/\s+/);
    const lastName = rest.join(" ") || null;

    // Synthetic email when none was provided so the contacts.email NOT NULL constraint holds.
    const identityEmail = email || `rsvp+${crypto.randomUUID()}@intoiq.local`;

    let contactId: string | null = null;
    if (email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("org_id", funnel.org_id)
        .eq("email", email)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      contactId = existing?.id ?? null;
    }

    if (!contactId) {
      const tagsArr: string[] = ["social-funnel"];
      if (sourceTag) tagsArr.push(sourceTag);
      const { data: inserted, error: insertErr } = await supabase
        .from("contacts")
        .insert({
          email: identityEmail,
          first_name: firstName || null,
          last_name: lastName,
          phone: phone || null,
          org_id: funnel.org_id,
          source_project_id: funnel.project_id ?? null,
          pipeline_stage: "new",
          tags: tagsArr,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      contactId = inserted.id;
    }

    // 3. Create a lead notification so it shows up in the dashboard feed.
    const { data: notif, error: notifErr } = await supabase
      .from("lead_notifications")
      .insert({
        org_id: funnel.org_id,
        project_id: funnel.project_id ?? null,
        contact_id: contactId,
        email: identityEmail,
        source: "social_funnel",
        metadata: {
          funnel_id: funnel.id,
          funnel_title: funnel.title,
          source_tag: sourceTag,
          name: name || null,
          phone: phone || null,
          email: email || null,
          submitted_at: new Date().toISOString(),
        },
      })
      .select("id")
      .single();
    if (notifErr) throw notifErr;

    // Fire-and-forget owner alert (reuse existing infra)
    try {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-first-lead`;
      fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ lead_notification_id: notif.id }),
      }).catch((e) => console.error("notify-first-lead dispatch failed:", e));
    } catch (e) {
      console.error("notify-first-lead bootstrap failed:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        success_message:
          (cfg.success_message as string) || "You're on the list! We can't wait to see you.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-funnel-rsvp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
