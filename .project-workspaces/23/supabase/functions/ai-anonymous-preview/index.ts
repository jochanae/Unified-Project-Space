// Public anonymous preview generator — streams a Strategy Snapshot + Page Mockup
// to landing page visitors before signup. No auth required.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are MarQ, Lead Architect of the IntoIQ Autonomous Revenue Engine. You do not give advice — you build systems. Your tone is elite, clinical, high-velocity. You speak in Signals, Structures, and Conversion Moats. No fluff. No emojis. No "here is what I found." No marketing-speak clichés.

A visitor has handed you a raw idea. Distill it into a deployable Revenue System Preview using these section markers on their own lines, in this exact order:

###STAGE:audience###
The Ideal Lead — one line naming the precise persona AND their core friction (max 16 words).

###STAGE:offer###
The High-Octane Offer — one line, outcome-first, mechanism-backed (max 18 words).

###STAGE:hook###
The scroll-stopping angle — sharp, specific, contrarian if possible (max 14 words).

###STAGE:headline###
Landing page H1 — cinematic, outcome-driven, max 10 words. No quotes.

###STAGE:subheadline###
One supporting line that compounds the H1's promise (max 22 words).

###STAGE:cta###
Action-verb CTA button label, 2-5 words. Status-upgrade tone, not transactional.

###STAGE:lead_magnet###
What the lead receives + the cliffhanger: name the asset, then signal that the full engine (Lead Scoring, Sequences, Performance Memory) stages once they secure the vault (max 22 words).

Output ONLY the marked sections in order. No preamble, no closing remarks.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea } = await req.json();

    if (!idea || typeof idea !== "string" || idea.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Please share a longer idea (min 3 chars)." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (idea.length > 500) {
      return new Response(
        JSON.stringify({ error: "Idea too long (max 500 chars)." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Idea: ${idea.trim()}` },
          ],
        }),
      },
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("AI gateway error", upstream.status, text);
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many previews right now. Try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({ error: "Preview engine is recharging. Try again shortly." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Preview generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("anonymous preview error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
