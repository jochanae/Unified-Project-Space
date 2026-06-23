import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BehaviorTrigger =
  | "viewed_no_convert"
  | "no_email_engagement"
  | "abandoned_checkout";

interface SequenceRow {
  id: string;
  org_id: string;
  project_id: string;
  subject: string;
  body: string;
  behavior_trigger: BehaviorTrigger | null;
  behavior_target_page_id: string | null;
  behavior_threshold_hours: number | null;
  is_active: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: seqs, error } = await supabase
      .from("email_sequences")
      .select(
        "id,org_id,project_id,subject,body,behavior_trigger,behavior_target_page_id,behavior_threshold_hours,is_active"
      )
      .eq("is_active", true)
      .not("behavior_trigger", "is", null);

    if (error) throw error;

    const seqRows = (seqs || []) as SequenceRow[];
    if (seqRows.length === 0) {
      return new Response(JSON.stringify({ ok: true, queued: 0, evaluated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let queued = 0;

    for (const seq of seqRows) {
      const thresholdH = seq.behavior_threshold_hours ?? 48;
      const cutoff = new Date(Date.now() - thresholdH * 3600_000).toISOString();
      let candidates: { contact_id: string; email: string }[] = [];

      if (seq.behavior_trigger === "viewed_no_convert") {
        // Page views by org > thresholdH ago for the target page (or any project page),
        // where the same email never submitted a form on that page.
        // We approximate "viewer email" via a same-IP/email match through form_submissions later;
        // since page_views don't carry email, we instead target *known contacts* of the org
        // who were created near a view but never submitted.
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id,email,created_at,source_project_id")
          .eq("org_id", seq.org_id)
          .eq("source_project_id", seq.project_id)
          .lte("created_at", cutoff)
          .limit(500);

        const ids = (contacts || []).map((c) => c.id);
        const submitted = new Set<string>();
        if (ids.length > 0) {
          const subQ = supabase
            .from("form_submissions")
            .select("contact_id,page_id")
            .in("contact_id", ids);
          const { data: subs } = seq.behavior_target_page_id
            ? await subQ.eq("page_id", seq.behavior_target_page_id)
            : await subQ;
          (subs || []).forEach((s) => submitted.add(s.contact_id));
        }
        candidates = (contacts || [])
          .filter((c) => !submitted.has(c.id))
          .map((c) => ({ contact_id: c.id, email: c.email }));
      } else if (seq.behavior_trigger === "no_email_engagement") {
        // Contacts who received a follow-up >= thresholdH ago and have zero opens/clicks since.
        const { data: stale } = await supabase
          .from("lead_followups")
          .select("recipient_email,created_at,opened_at,clicked_at,org_id")
          .eq("org_id", seq.org_id)
          .lte("created_at", cutoff)
          .is("opened_at", null)
          .is("clicked_at", null)
          .limit(1000);

        const emails = Array.from(
          new Set((stale || []).map((s) => (s.recipient_email || "").toLowerCase()))
        ).filter(Boolean);
        if (emails.length === 0) continue;

        const { data: contacts } = await supabase
          .from("contacts")
          .select("id,email")
          .eq("org_id", seq.org_id)
          .in("email", emails);
        candidates = (contacts || []).map((c) => ({ contact_id: c.id, email: c.email }));
      } else if (seq.behavior_trigger === "abandoned_checkout") {
        // Pending checkout sessions older than thresholdH that never completed.
        const { data: cs } = await supabase
          .from("checkout_sessions")
          .select("customer_email,status,created_at,completed_at")
          .eq("org_id", seq.org_id)
          .eq("status", "pending")
          .is("completed_at", null)
          .lte("created_at", cutoff)
          .limit(500);

        const emails = Array.from(
          new Set((cs || []).map((s) => (s.customer_email || "").toLowerCase()))
        ).filter(Boolean);
        if (emails.length === 0) continue;

        const { data: contacts } = await supabase
          .from("contacts")
          .select("id,email")
          .eq("org_id", seq.org_id)
          .in("email", emails);
        candidates = (contacts || []).map((c) => ({ contact_id: c.id, email: c.email }));
      }

      if (candidates.length === 0) continue;

      // Skip already-queued for this (sequence, contact, behavior)
      const { data: prior } = await supabase
        .from("queued_behavior_log")
        .select("contact_id")
        .eq("sequence_id", seq.id)
        .eq("behavior_trigger", seq.behavior_trigger!)
        .in(
          "contact_id",
          candidates.map((c) => c.contact_id)
        );
      const skip = new Set((prior || []).map((p) => p.contact_id));
      const fresh = candidates.filter((c) => !skip.has(c.contact_id));
      if (fresh.length === 0) continue;

      // Find a recent lead_notification per email to attach the follow-up to (optional).
      const emails = fresh.map((c) => c.email.toLowerCase());
      const { data: notifs } = await supabase
        .from("lead_notifications")
        .select("id,email")
        .eq("org_id", seq.org_id)
        .in("email", emails)
        .order("created_at", { ascending: false });
      const notifByEmail = new Map<string, string>();
      for (const n of notifs || []) {
        const k = n.email.toLowerCase();
        if (!notifByEmail.has(k)) notifByEmail.set(k, n.id);
      }

      const sysUserId = (
        await supabase.from("users").select("id").eq("org_id", seq.org_id).limit(1).maybeSingle()
      ).data?.id;
      if (!sysUserId) continue;

      // Insert scheduled follow-ups + log
      const inserts = fresh.map((c) => ({
        org_id: seq.org_id,
        scheduled_by: sysUserId,
        lead_notification_id: notifByEmail.get(c.email.toLowerCase()) || null,
        recipient_email: c.email,
        subject: seq.subject,
        body: seq.body,
        send_at: new Date().toISOString(),
        status: "pending",
        source: `behavior:${seq.behavior_trigger}`,
      }));

      const { error: sfErr } = await supabase.from("scheduled_followups").insert(inserts);
      if (sfErr) {
        console.error("scheduled_followups insert error:", sfErr);
        continue;
      }

      await supabase.from("queued_behavior_log").insert(
        fresh.map((c) => ({
          org_id: seq.org_id,
          sequence_id: seq.id,
          contact_id: c.contact_id,
          behavior_trigger: seq.behavior_trigger!,
        }))
      );

      queued += fresh.length;
    }

    return new Response(JSON.stringify({ ok: true, queued, evaluated: seqRows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-behavior-triggers error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
