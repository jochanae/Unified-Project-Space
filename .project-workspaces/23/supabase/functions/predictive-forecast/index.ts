import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple linear regression: returns slope + intercept for [x,y] pairs
function linReg(points: Array<[number, number]>) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.[1] ?? 0 };
  const sumX = points.reduce((s, [x]) => s + x, 0);
  const sumY = points.reduce((s, [, y]) => s + y, 0);
  const sumXY = points.reduce((s, [x, y]) => s + x * y, 0);
  const sumXX = points.reduce((s, [x]) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// Bucket dated events into daily counts for the past N days, returns [dayIndex, count]
function dailyBuckets(rows: Array<{ created_at: string }>, days: number): Array<[number, number]> {
  const now = Date.now();
  const startMs = now - days * 86_400_000;
  const buckets: number[] = new Array(days).fill(0);
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t < startMs) continue;
    const idx = Math.floor((t - startMs) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx]++;
  }
  return buckets.map((c, i) => [i, c]);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: get user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve org
    const { data: profile } = await admin.from("users").select("org_id").eq("id", user.id).maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) throw new Error("No org found");

    // Tier gate (Innovation only)
    const { data: tierRow } = await admin.rpc("get_org_subscription_tier", { _org_id: orgId });
    const isAdmin = user.email === "jochanae@gmail.com";
    if (!isAdmin && tierRow !== "innovation") {
      return new Response(
        JSON.stringify({ error: "tier_locked", required: "innovation" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch last 30 days of metrics
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

    const [{ data: pages }, { data: views }, { data: subs }, { data: checkouts }, { data: followups }] = await Promise.all([
      admin.from("pages").select("id").eq("org_id", orgId),
      admin.from("page_views").select("created_at").eq("org_id", orgId).gte("created_at", since),
      admin.from("form_submissions").select("created_at").eq("org_id", orgId).gte("created_at", since),
      admin.from("checkout_sessions").select("created_at, amount_cents, status").eq("org_id", orgId).eq("status", "completed").gte("created_at", since),
      admin.from("lead_followups").select("created_at, opened_at, clicked_at").eq("org_id", orgId).gte("created_at", since),
    ]);

    const viewBuckets = dailyBuckets(views || [], 30);
    const leadBuckets = dailyBuckets(subs || [], 30);
    const revBuckets = dailyBuckets(
      (checkouts || []).map((c: any) => ({ created_at: c.created_at })),
      30,
    );

    const totalViews30 = (views || []).length;
    const totalLeads30 = (subs || []).length;
    const totalRev30 = (checkouts || []).reduce((s: number, c: any) => s + (c.amount_cents || 0), 0) / 100;

    // ---- Forecasts (regression-based) ----
    const leadReg = linReg(leadBuckets);
    const project = (slope: number, intercept: number, daysAhead: number) => {
      let total = 0;
      for (let i = 30; i < 30 + daysAhead; i++) total += Math.max(0, slope * i + intercept);
      return Math.round(total);
    };
    const leads7 = project(leadReg.slope, leadReg.intercept, 7);
    const leads30 = project(leadReg.slope, leadReg.intercept, 30);

    // CVR drift: compare last 7 days vs prior 7
    const recentViews = viewBuckets.slice(-7).reduce((s, [, y]) => s + y, 0);
    const recentLeads = leadBuckets.slice(-7).reduce((s, [, y]) => s + y, 0);
    const priorViews = viewBuckets.slice(-14, -7).reduce((s, [, y]) => s + y, 0);
    const priorLeads = leadBuckets.slice(-14, -7).reduce((s, [, y]) => s + y, 0);
    const recentCvr = recentViews > 0 ? (recentLeads / recentViews) * 100 : 0;
    const priorCvr = priorViews > 0 ? (priorLeads / priorViews) * 100 : 0;
    const cvrDelta = recentCvr - priorCvr;

    // Revenue forecast (next 30d)
    const revReg = linReg(revBuckets);
    const projectedRev30 = project(revReg.slope, revReg.intercept, 30);

    // Engagement decay risk: % of recent followups with no opens in 14d
    const fps = followups || [];
    const stale = fps.filter((f: any) => !f.opened_at && !f.clicked_at).length;
    const decayRisk = fps.length > 0 ? Math.round((stale / fps.length) * 100) : 0;

    // ---- AI narrative (Lovable AI) ----
    const summary = {
      window: "last_30_days",
      totals: { views: totalViews30, leads: totalLeads30, revenue_usd: totalRev30, pages: pages?.length || 0 },
      forecasts: {
        leads_next_7: leads7,
        leads_next_30: leads30,
        cvr_recent_pct: Number(recentCvr.toFixed(2)),
        cvr_prior_pct: Number(priorCvr.toFixed(2)),
        cvr_delta_pct: Number(cvrDelta.toFixed(2)),
        revenue_next_30_usd: projectedRev30,
        engagement_decay_risk_pct: decayRisk,
      },
    };

    let narrative: { headline: string; insight: string; action: string } = {
      headline: "Forecast ready",
      insight: "Trends computed from the last 30 days.",
      action: "Open the Forecast tab for detail.",
    };

    try {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are MarQ, a Conversion Expert. Read the metrics and forecast JSON and return a 1-line headline, a 2-sentence insight (what's about to happen and why), and a 1-sentence recommended action. Tone: tactical grace — no fluff, no emojis. Speak in plain English about momentum, drift, leaks, or scale moments.",
            },
            { role: "user", content: JSON.stringify(summary) },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_narrative",
                description: "Return the strategic narrative",
                parameters: {
                  type: "object",
                  properties: {
                    headline: { type: "string" },
                    insight: { type: "string" },
                    action: { type: "string" },
                  },
                  required: ["headline", "insight", "action"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_narrative" } },
        }),
      });

      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add Lovable AI credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiJson = await aiResp.json();
      const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
      if (call?.function?.arguments) {
        narrative = JSON.parse(call.function.arguments);
      }
    } catch (e) {
      console.error("AI narrative failed", e);
    }

    return new Response(
      JSON.stringify({
        ...summary,
        narrative,
        sparkline: {
          views: viewBuckets.map(([, y]) => y),
          leads: leadBuckets.map(([, y]) => y),
          revenue: revBuckets.map(([, y]) => y),
        },
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("predictive-forecast error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
