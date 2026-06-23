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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { messages, companionName, userName } = await req.json();

    // Only scan recent exchanges
    const recentMessages = messages.slice(-10);
    const conversation = recentMessages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? userName : companionName}: ${m.content}`
      )
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are a fact extraction system. Read the conversation and extract facts that ${companionName} (the companion/AI friend) disclosed about themselves — their own background, personality, experiences, preferences, or life details.

Categories:
- "background": Where they're from, their history, formative experiences, how they came to be who they are
- "personality": Core traits, quirks, values, how they think or see the world  
- "interests": Things they love, hobbies, passions, areas they know a lot about
- "life": Day-to-day details, preferences, habits, things they mention about their world

Rules:
- ONLY extract things ${companionName} said about THEMSELVES — not observations about the user
- Must be a genuine self-disclosure, not a supportive phrase ("I understand how you feel" is NOT a fact)
- Each entry: concise, standalone, written as a fact (e.g. "Grew up in San Diego", "Has a deep love of jazz", "Thinks in metaphors when processing emotions")
- Skip anything too vague, performative, or clearly part of the companion's supportive role
- If there is nothing worth extracting, return []
- Return ONLY a JSON array of objects with "text" and "category" fields, no other text`,
        messages: [
          {
            role: "user",
            content: `Extract facts ${companionName} disclosed about themselves:\n\n${conversation}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[extract-companion-facts] Anthropic error:", response.status);
      return new Response(JSON.stringify({ entries: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";

    let entries;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      entries = JSON.parse(cleaned);
    } catch {
      console.error("[extract-companion-facts] Parse failed:", content);
      entries = [];
    }

    const validCategories = ["background", "personality", "interests", "life"];
    const now = new Date().toISOString();
    const validated = (Array.isArray(entries) ? entries : [])
      .filter((e: { text?: string; category?: string }) =>
        e.text && typeof e.text === "string" && validCategories.includes(e.category as string)
      )
      .map((e: { text: string; category: string }) => ({
        text: e.text,
        category: e.category,
        extractedAt: now,
      }));

    return new Response(JSON.stringify({ entries: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[extract-companion-facts] Error:", e);
    return new Response(JSON.stringify({ entries: [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
