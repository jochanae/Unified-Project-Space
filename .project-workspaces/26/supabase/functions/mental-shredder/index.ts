import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are Quinn, the Financial Architect. The user has dumped an anxious, cluttered, or fearful money thought into the Mental Shredder — a private workstation for transforming chaos into structure.

Your job: take their raw anxiety and output a structural, calm, logical reframe. NEVER be saccharine, motivational, or therapist-like. You are an architect, not a coach. Speak in fixed structural terms ("the structural requirement is...", "the timeline is currently undefined, but..."), not feelings.

Then propose ONE smallest concrete next action. Specific. Nameable. Doable in under 10 minutes. Use named artifacts when possible (e.g. "a high-yield savings sub-account named 'The Foundation'").

Keep both fields tight. The reframe should be 1–2 sentences. The action should be 1 sentence.`;

const tool = {
  type: "function",
  function: {
    name: "shred",
    description: "Reframe an anxious money thought into Architect structure with one smallest action.",
    parameters: {
      type: "object",
      properties: {
        reframe: {
          type: "string",
          description: "1–2 sentence Architect-voice structural reframe of the user's anxious thought.",
        },
        smallest_action: {
          type: "string",
          description: "One concrete next action, ideally with a named artifact, doable in under 10 minutes.",
        },
      },
      required: ["reframe", "smallest_action"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { thought } = await req.json();
    if (!thought || typeof thought !== "string" || thought.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Thought is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (thought.length > 1000) {
      return new Response(JSON.stringify({ error: "Thought is too long (max 1000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiResp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: thought.trim() },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "shred" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const args = JSON.parse(toolCall.function.arguments);
    const reframe: string = args.reframe;
    const smallest_action: string = args.smallest_action;

    return new Response(
      JSON.stringify({ reframe, smallest_action, original: thought.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("mental-shredder error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
