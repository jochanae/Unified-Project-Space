import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MINOR_PROMPT = `You are a child-safety image moderator. Analyze this image and determine if it is appropriate for a user under 18 to use as their companion avatar.

ALLOW: pets, toys, stuffed animals, cartoon characters, nature scenes, landscapes, objects, food, sports, vehicles, abstract art, animals, wholesome artwork.

BLOCK: violence, weapons, blood/gore, suggestive/sexual content, nudity, drugs/alcohol, scary/horror imagery, hate symbols, real people in inappropriate contexts.

Respond with EXACTLY one word: APPROVED or REJECTED
If REJECTED, add a brief reason on the next line.`;

const ADULT_PROMPT = `You are a content moderator. Analyze this image for use as a companion avatar.

ALLOW: almost everything — portraits, art, animals, objects, abstract, stylized, etc.

BLOCK ONLY: illegal content, CSAM, extreme graphic violence, hate symbols.

Respond with EXACTLY one word: APPROVED or REJECTED
If REJECTED, add a brief reason on the next line.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, isMinor } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      // Fail open for adults, fail closed for minors
      return new Response(
        JSON.stringify({ approved: !isMinor, reason: isMinor ? "Safety check unavailable" : undefined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = isMinor ? MINOR_PROMPT : ADULT_PROMPT;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Is this image appropriate?" },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // Fail open for adults, fail closed for minors
      return new Response(
        JSON.stringify({ approved: !isMinor, reason: isMinor ? "Safety check unavailable" : undefined }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();
    const lines = reply.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const verdict = lines[0]?.toUpperCase();
    const reason = lines.length > 1 ? lines.slice(1).join(" ") : undefined;

    const approved = verdict === "APPROVED";

    return new Response(
      JSON.stringify({ approved, reason: approved ? undefined : reason || "Image did not pass safety review" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("moderate-image error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
