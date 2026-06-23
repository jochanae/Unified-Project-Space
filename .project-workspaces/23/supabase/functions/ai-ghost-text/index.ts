import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ suggestion: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a funnel strategist autocomplete. Given partial user input about a business goal, suggest a natural continuation (1-2 short phrases). Output ONLY the continuation text, nothing else. Keep it concise and actionable. If the input is already complete, output an empty string.`,
          },
          { role: "user", content: input },
        ],
        max_tokens: 60,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      return new Response(JSON.stringify({ suggestion: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const suggestion = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ghost-text error:", e);
    return new Response(JSON.stringify({ suggestion: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
