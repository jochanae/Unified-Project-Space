import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-quinn-directives",
};

type BlueprintSection = {
  title: string;
  points: string[];
};

type BlueprintResponse = {
  sections: BlueprintSection[];
  generatedAt: string;
  projectName: string;
};

const REQUIRED_TITLES = [
  "ACQUISITION",
  "ACTIVATION",
  "THE CRITICAL GAP",
  "RETENTION",
  "REVENUE",
];

function stripMarkdownCodeFences(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

function validateBlueprintPayload(payload: unknown): BlueprintResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid blueprint payload");
  }

  const raw = payload as Record<string, unknown>;
  if (!Array.isArray(raw.sections)) {
    throw new Error("Blueprint must include sections array");
  }

  const sections = raw.sections as unknown[];
  if (sections.length !== 5) {
    throw new Error("Blueprint must contain exactly 5 sections");
  }

  const titles = new Set<string>();
  const normalizedSections: BlueprintSection[] = sections.map((section, idx) => {
    if (!section || typeof section !== "object") {
      throw new Error(`Section ${idx + 1} is invalid`);
    }
    const s = section as Record<string, unknown>;
    if (typeof s.title !== "string") {
      throw new Error(`Section ${idx + 1} missing title`);
    }
    if (!Array.isArray(s.points) || s.points.length !== 4) {
      throw new Error(`Section "${s.title}" must contain exactly 4 points`);
    }
    if (!s.points.every((p) => typeof p === "string")) {
      throw new Error(`Section "${s.title}" points must be strings`);
    }
    titles.add(s.title);
    return {
      title: s.title,
      points: s.points as string[],
    };
  });

  for (const required of REQUIRED_TITLES) {
    if (!titles.has(required)) {
      throw new Error(`Missing required section "${required}"`);
    }
  }

  return {
    sections: normalizedSections,
    generatedAt:
      typeof raw.generatedAt === "string" ? raw.generatedAt : new Date().toISOString(),
    projectName: typeof raw.projectName === "string" ? raw.projectName : "",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const authClient = createClient(supabaseUrl, supabaseKey);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { projectId } = await req.json();
    if (!projectId) throw new Error("projectId is required");

    const [projectRes, contextRes] = await Promise.all([
      supabase.from("projects").select("name, goal").eq("id", projectId).single(),
      supabase
        .from("project_context")
        .select("directive, context_type")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (projectRes.error || !projectRes.data) {
      throw new Error("Project not found");
    }

    const project = projectRes.data;
    const signalContexts = (contextRes.data || []).filter((c) => c.context_type === "signal_lab");

    const signalLines: string[] = [];
    for (const ctx of signalContexts) {
      try {
        const parsed = JSON.parse(ctx.directive as string);
        if (parsed.oneLiner) signalLines.push(`- One-Liner: ${parsed.oneLiner}`);
        if (parsed.elevatorPitch) signalLines.push(`- Elevator Pitch: ${parsed.elevatorPitch}`);
        if (parsed.persona?.role) signalLines.push(`- Persona Role: ${parsed.persona.role}`);
        if (parsed.persona?.frustrations?.length) {
          signalLines.push(`- Persona Frustrations: ${parsed.persona.frustrations.join(", ")}`);
        }
        if (parsed.persona?.desires?.length) {
          signalLines.push(`- Persona Desires: ${parsed.persona.desires.join(", ")}`);
        }
      } catch {
        signalLines.push(`- Raw Signal Context: ${ctx.directive}`);
      }
    }

    const systemPrompt = `You are MarQ, an elite growth strategist.

Generate a Strategy Blueprint for the given project.

Rules:
- You MUST output exactly 5 sections with these exact titles:
  1) ACQUISITION
  2) ACTIVATION
  3) THE CRITICAL GAP
  4) RETENTION
  5) REVENUE
- Each section MUST contain exactly 4 bullet points in the "points" array.
- Bullet points must be concise, tactical, and specific to this project context.
- Return ONLY valid JSON.
- No markdown.
- No code fences.
- No preamble or commentary.

Project:
- Name: ${project.name || "Untitled Project"}
- Goal: ${project.goal || "No explicit goal provided"}

Signal Lab context:
${signalLines.length ? signalLines.join("\n") : "- No Signal Lab context found"}

Return this exact JSON shape:
{
  "sections": [
    {
      "title": "ACQUISITION",
      "points": ["point1", "point2", "point3", "point4"]
    },
    {
      "title": "ACTIVATION",
      "points": ["point1", "point2", "point3", "point4"]
    },
    {
      "title": "THE CRITICAL GAP",
      "points": ["point1", "point2", "point3", "point4"]
    },
    {
      "title": "RETENTION",
      "points": ["point1", "point2", "point3", "point4"]
    },
    {
      "title": "REVENUE",
      "points": ["point1", "point2", "point3", "point4"]
    }
  ],
  "generatedAt": "<ISO timestamp>",
  "projectName": "<project name>"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the strategy blueprint now." },
        ],
        stream: false,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiJson = await aiResponse.json();
    const rawContent = aiJson?.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string" || !rawContent.trim()) {
      throw new Error("AI returned empty response");
    }

    const cleaned = stripMarkdownCodeFences(rawContent);
    const parsed = JSON.parse(cleaned);
    const blueprint = validateBlueprintPayload(parsed);
    if (!blueprint.projectName) blueprint.projectName = project.name || "";

    return new Response(JSON.stringify(blueprint), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-strategy-blueprint error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
