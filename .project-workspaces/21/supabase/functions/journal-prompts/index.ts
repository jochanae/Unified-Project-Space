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

    const { userName, recentMoods, recentJournals, recentGratitudes, memories, activeConnectionNames, recentConversation } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    // Build context from wellness data
    let context = "";
    if (recentMoods?.length > 0) {
      context += `Recent moods: ${recentMoods.map((m: any) => `${m.emoji} (${m.note || 'no note'})`).join(', ')}\n`;
    }
    if (recentJournals?.length > 0) {
      context += `Recent journal themes: ${recentJournals.map((j: any) => j.content.slice(0, 80)).join(' | ')}\n`;
    }
    if (recentGratitudes?.length > 0) {
      const allItems = recentGratitudes.flatMap((g: any) => g.items || []);
      context += `Recent gratitude items: ${allItems.slice(0, 6).join(', ')}\n`;
    }
    if (memories?.trim()) {
      context += `\nThings known about ${userName}:\n${memories}\n`;
    }
    if (recentConversation?.length > 0) {
      const formatted = recentConversation.map((m: { role?: string; content?: string }) => {
        const excerpt = (m.content || "").slice(0, 100);
        return `${m.role || "unknown"}: ${excerpt}`;
      }).join("\n");
      context += `\nRecent conversation with their companion:\n${formatted}\n`;
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You generate deeply personal, emotionally intelligent journal prompts for a wellness app. 
The user is named ${userName}. Based on their recent mood patterns, journal entries, gratitude items, and memories, 
generate 3 unique journal prompts that feel personal and relevant — not generic.

Rules:
- Each prompt should be 1-2 sentences
- Reference specific themes from their data (without being creepy or clinical)
- Vary the tone: one reflective, one forward-looking, one emotional/vulnerable
- Make them feel like a caring friend is asking
${activeConnectionNames && activeConnectionNames.length > 0 
  ? `- The user currently has these companions: ${activeConnectionNames.join(', ')}. You may reference them naturally.`
  : `- The user does not currently have any active companions. Do NOT reference any companion names.`}
- If recent conversation data is present, reference themes or feelings from that conversation naturally in the journal prompts — so the wellness suggestions feel connected to what the user and their companion were just talking about.
- IMPORTANT: Do NOT mention any names that are not in the active companions list above
- Return ONLY a JSON array of 3 strings, no other text`,
          },
          {
            role: "user",
            content: context || `Generate 3 journal prompts for someone named ${userName} who is just getting started with journaling.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits needed." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ prompts: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let prompts: string[];
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      prompts = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse prompts:", content);
      prompts = [];
    }

    return new Response(JSON.stringify({ prompts: Array.isArray(prompts) ? prompts.slice(0, 3) : [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Journal prompt error:", e);
    return new Response(
      JSON.stringify({ prompts: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
