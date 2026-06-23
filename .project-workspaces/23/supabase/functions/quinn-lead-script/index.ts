import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: lead } = await supabase
      .from("lead_notifications")
      .select("email, source, org_id, project_id, metadata")
      .eq("id", lead_notification_id)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let projectGoal = "";
    if (lead.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("name, goal")
        .eq("id", lead.project_id)
        .maybeSingle();
      projectGoal = proj?.goal ? `Project: ${proj.name}. Goal: ${proj.goal}.` : "";
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are MarQ, an Intelligent Execution Engine with a Tactical Grace tone. Generate a concise, professional follow-up script for a brand-new lead. Output JSON only with keys: subject, body, tone_note. The body must be 3 short paragraphs (under 90 words total), warm but precise, no emojis, no exclamation marks.`;

    const userPrompt = `${projectGoal}\nNew lead email: ${lead.email}\nSource: ${lead.source}\nWrite the first follow-up message they should receive.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${txt}`);
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { subject: "Quick hello", body: content, tone_note: "" };
    }

    return new Response(JSON.stringify({ success: true, script: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("quinn-lead-script error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
