import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tactical Grace re-engagement copy — single send per subscriber per cool-down window.
const SUBJECT = "Still building? MarQ has fresh signal for you.";
const COOL_DOWN_DAYS = 30; // never re-engage the same subscriber more than once per month
const THRESHOLD_SCORE = 20; // matches engagement-decay 'cold' threshold

function bodyFor(firstName: string | null, projectName: string | null): string {
  const greeting = firstName ? `Hey ${firstName},` : "Hey,";
  const project = projectName ? ` for ${projectName}` : "";
  return `${greeting}

It's been a quiet stretch. Your signal${project} hasn't been moving — but momentum is one decision away.

MarQ pulled three intelligence triggers worth reviewing:
• Where your funnel is leaking
• Which hook to sharpen first
• What to ship in the next 30 minutes

Open IntoIQ → https://intoiq.app/dashboard

If this stopped serving you, you can opt out anytime via the link below. No friction.

— The IntoIQ Team`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const coolDownCutoff = new Date(now.getTime() - COOL_DOWN_DAYS * 24 * 3600 * 1000).toISOString();

    // Find decayed subscribers eligible for re-engagement
    const { data: candidates, error } = await supabase
      .from("subscribers")
      .select("id, email, first_name, org_id, project_id, engagement_score, status, tags, last_engaged_at")
      .lte("engagement_score", THRESHOLD_SCORE)
      .in("status", ["active", "cold"])
      .gt("engagement_score", 0); // truly dead (0) handled separately

    if (error) throw error;

    let queued = 0;
    let skippedRecent = 0;
    let skippedNoOwner = 0;

    for (const sub of candidates ?? []) {
      const tags: string[] = sub.tags ?? [];
      // Cool-down: skip if already re-engaged within window
      const lastTag = tags.find((t) => t.startsWith("reengaged:"));
      if (lastTag) {
        const ts = lastTag.split(":")[1];
        if (ts && ts > coolDownCutoff) {
          skippedRecent++;
          continue;
        }
      }

      // Find an owner in the org to attribute the scheduled followup
      const { data: owner } = await supabase
        .from("users")
        .select("id")
        .eq("org_id", sub.org_id)
        .limit(1)
        .maybeSingle();
      if (!owner?.id) { skippedNoOwner++; continue; }

      // Resolve project name (if any)
      let projectName: string | null = null;
      if (sub.project_id) {
        const { data: proj } = await supabase
          .from("projects")
          .select("name")
          .eq("id", sub.project_id)
          .maybeSingle();
        projectName = proj?.name ?? null;
      }

      const { error: insertErr } = await supabase.from("scheduled_followups").insert({
        org_id: sub.org_id,
        scheduled_by: owner.id,
        recipient_email: sub.email,
        subject: SUBJECT,
        body: bodyFor(sub.first_name, projectName),
        send_at: new Date().toISOString(),
        status: "pending",
        source: "reengagement_decay",
      });
      if (insertErr) {
        console.error("Insert scheduled_followup failed:", insertErr);
        continue;
      }

      // Stamp re-engagement attempt on the subscriber so we honor the cool-down
      const stampedTags = tags.filter((t) => !t.startsWith("reengaged:"));
      stampedTags.push(`reengaged:${now.toISOString()}`);
      await supabase
        .from("subscribers")
        .update({ tags: stampedTags, updated_at: now.toISOString() })
        .eq("id", sub.id);

      queued++;
    }

    const result = {
      candidates: (candidates ?? []).length,
      queued,
      skipped_recent: skippedRecent,
      skipped_no_owner: skippedNoOwner,
      timestamp: now.toISOString(),
    };
    console.log("Re-engagement pass complete:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("subscriber-reengagement error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
