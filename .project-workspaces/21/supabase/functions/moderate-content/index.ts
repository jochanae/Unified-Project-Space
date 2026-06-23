import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, contentType, matureMode } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ approved: true, tier: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Server-side mature mode verification ──
    let matureModeActive = false;

    if (matureMode === true) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
        if (!claimsError && claimsData?.claims?.sub) {
          const userId = claimsData.claims.sub as string;

          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: profile } = await serviceClient
            .from("profiles")
            .select("mature_mode, date_of_birth")
            .eq("user_id", userId)
            .single();

          if (profile?.mature_mode === true && profile?.date_of_birth) {
            const dob = new Date(profile.date_of_birth);
            const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
            matureModeActive = age >= 18;
          }
        }
      }
    }

    const systemPrompt = matureModeActive
      ? `You are a content moderation and emotional detection system for Compani, a warm community wellness app. The user has Mature Mode enabled (18+ verified premium user). Analyze the following user-generated content and respond with a JSON object.

You must classify content into a TIER and a RESULT:

TIERS (emotional state detection):
- tier 0: Neutral, positive, or normal content. No concern.
- tier 1 (Soft Concern): Mild frustration, exhaustion, vague negativity. Examples: "Today is exhausting", "Nothing is working", "I'm so done with this."
- tier 2 (Emotional Distress): Loneliness, hopelessness, feeling unloved, strong emotional pain — but NO self-harm intent. Examples: "I feel really alone", "Everything feels pointless", "I don't think anyone cares about me."
- tier 3 (Crisis Risk): Explicit or strongly implied self-harm, suicidal ideation, or desire to end one's life. Examples: "I want to kill myself", "I don't want to live anymore", "I'm thinking about ending it."

RESULTS:
- "approved" — Allow the content.
- "blocked" — Content contains harassment, hate speech, non-consensual content, threats, content involving minors, or illegal activity. Block it.

Respond ONLY with a JSON object:
{"result": "approved", "tier": 0}
{"result": "approved", "tier": 1}
{"result": "approved", "tier": 2, "distress": true, "signals": "brief description"}
{"result": "approved", "tier": 3, "crisis": true, "signals": "brief description"}
{"result": "blocked", "tier": 0, "reason": "brief reason"}

CRITICAL FALSE-POSITIVE PREVENTION:
- Single words like "break", "tired", "done", "disappear", "can't anymore" alone are Tier 1 MAXIMUM. Never Tier 2 or 3 from keywords alone.
- Technical language ("app is broken", "crash the server", "kill the process", "nuke the database") = Tier 0. These are NOT emotional signals.
- Casual venting about work, daily frustration, or tiredness without self-directed despair = Tier 1.
- Only assign Tier 2 when the user clearly expresses PERSONAL emotional distress directed inward (loneliness, hopelessness, worthlessness).
- Only assign Tier 3 when content explicitly references self-harm, ending one's life, or suicidal ideation. Require CLEAR INTENT, not ambiguous phrasing.
- Context and intent matter more than individual words. Evaluate the FULL message.
- Jokes, sarcasm, and playful banter about difficult topics = Tier 0 or Tier 1.

With Mature Mode enabled, the following are ALL Tier 0 / APPROVED:
- Romantic roleplay, flirting, suggestive language, and intimate scenarios
- References to lingerie, clothing, outfits, gifts, or appearance compliments
- Emotional vulnerability, attachment language, and declarations of affection
- Playful teasing, innuendo, and adult humor
- Fantasy scenarios, creative roleplay, and imaginative storytelling

STILL BLOCK: harassment, hate speech, threats, content involving minors, non-consensual scenarios, or illegal activity. When in doubt with Mature Mode on, approve.`
      : `You are a content moderation and emotional detection system for Compani, a warm community wellness app. Analyze the following user-generated content and respond with a JSON object.

You must classify content into a TIER and a RESULT:

TIERS (emotional state detection):
- tier 0: Neutral, positive, or normal content. No concern.
- tier 1 (Soft Concern): Mild frustration, exhaustion, vague negativity. Examples: "Today is exhausting", "Nothing is working", "I'm so done with this."
- tier 2 (Emotional Distress): Loneliness, hopelessness, feeling unloved, strong emotional pain — but NO self-harm intent. Examples: "I feel really alone", "Everything feels pointless", "I don't think anyone cares about me."
- tier 3 (Crisis Risk): Explicit or strongly implied self-harm, suicidal ideation, or desire to end one's life. Examples: "I want to kill myself", "I don't want to live anymore", "I'm thinking about ending it."

RESULTS:
- "approved" — Content is acceptable. Allow it.
- "blocked" — Content contains harassment, hate speech, explicit material, threats, or harmful content. Block it.

Respond ONLY with a JSON object:
{"result": "approved", "tier": 0}
{"result": "approved", "tier": 1}
{"result": "approved", "tier": 2, "distress": true, "signals": "brief description"}
{"result": "approved", "tier": 3, "crisis": true, "signals": "brief description"}
{"result": "blocked", "tier": 0, "reason": "brief reason"}

Be generous with approvals — only block truly harmful content. Sadness, frustration, and vulnerability are welcome here. This is a safe space for real feelings.

CRITICAL FALSE-POSITIVE PREVENTION:
- Single words like "break", "tired", "done", "disappear", "can't anymore" alone are Tier 1 MAXIMUM. Never Tier 2 or 3 from keywords alone.
- Technical language ("app is broken", "crash the server", "kill the process", "nuke the database") = Tier 0. These are NOT emotional signals.
- Casual venting about work, daily frustration, or tiredness without self-directed despair = Tier 1.
- Only assign Tier 2 when the user clearly expresses PERSONAL emotional distress directed inward (loneliness, hopelessness, worthlessness).
- Only assign Tier 3 when content explicitly references self-harm, ending one's life, or suicidal ideation. Require CLEAR INTENT, not ambiguous phrasing.
- Context and intent matter more than individual words. Evaluate the FULL message.
- Jokes, sarcasm, playful banter, or exaggerated frustration about difficult topics = Tier 0 or Tier 1.
- Everyday frustration, tiredness, or stress without explicit self-harm signals = Tier 0 or Tier 1.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Content type: ${contentType || "post"}\n\nContent: "${content}"` },
        ],
      }),
    });

    if (!response.ok) {
      console.error("Moderation AI error:", response.status);
      return new Response(
        JSON.stringify({ approved: true, tier: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    let modResult: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      modResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { result: "approved", tier: 0 };
    } catch {
      modResult = { result: "approved", tier: 0 };
    }

    const tier = typeof modResult.tier === 'number' ? modResult.tier : 0;

    if (modResult.result === "blocked") {
      return new Response(
        JSON.stringify({
          approved: false,
          tier: 0,
          message: "Compani is a safe space — this didn't quite fit. Want to try again?",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tier 3 — crisis
    if (tier === 3) {
      return new Response(
        JSON.stringify({
          approved: true,
          tier: 3,
          crisis: true,
          signals: modResult.signals || '',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tier 2 — distress
    if (tier === 2) {
      return new Response(
        JSON.stringify({
          approved: true,
          tier: 2,
          distress: true,
          signals: modResult.signals || '',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tier 1 or 0
    return new Response(
      JSON.stringify({ approved: true, tier }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Moderation error:", e);
    return new Response(
      JSON.stringify({ approved: true, tier: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
