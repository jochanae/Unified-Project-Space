import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-quinn-directives",
};

// Upgraded to Claude Sonnet 4.5 — same cost tier, meaningfully smarter for strategy work.
const ANTHROPIC_MODEL = "claude-sonnet-4-5";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured. Add it in Lovable Cloud secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT by passing the token explicitly to getUser().
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      console.warn("quinn-chat auth failed:", userError?.message ?? "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const user = { id: userData.user.id };

    const { messages, projectId } = await req.json();
    if (!messages || !projectId) throw new Error("messages and projectId are required");

    // Pull project, contexts, user — and the new operational signals (studio, brand, CRM)
    const [projectRes, contextRes, userRes, userOrgRes] = await Promise.all([
      supabase.from("projects").select("name, goal").eq("id", projectId).single(),
      supabase
        .from("project_context")
        .select("directive, context_type, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("users").select("display_name").eq("id", user.id).maybeSingle(),
      supabase.from("users").select("org_id").eq("id", user.id).maybeSingle(),
    ]);

    const project = projectRes.data;
    const allContexts = contextRes.data || [];
    const displayName = userRes.data?.display_name || "Operator";
    const orgId = userOrgRes.data?.org_id as string | undefined;

    // Operational signals — RLS-safe (uses the user's JWT-scoped client)
    const [brandRes, crmRes, leadRes] = await Promise.all([
      supabase
        .from("brand_kits")
        .select("name, is_default, kit, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
      orgId
        ? supabase
            .from("contacts")
            .select("pipeline_stage")
            .eq("org_id", orgId)
        : Promise.resolve({ data: [] as { pipeline_stage: string }[] }),
      orgId
        ? supabase
            .from("lead_notifications")
            .select("email, source, created_at")
            .eq("org_id", orgId)
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as { email: string; source: string; created_at: string }[] }),
    ]);
    
    const brandKits = brandRes.data || [];
    const contacts = (crmRes.data || []) as { pipeline_stage: string }[];
    const recentLeads = (leadRes.data || []) as { email: string; source: string; created_at: string }[];

    // Split strategy_blueprint from other contexts (handled separately, no double-injection)
    const strategyBlueprintRow = allContexts.find((c: any) => c.context_type === "strategy_blueprint");
    const contexts = allContexts.filter((c: any) => c.context_type !== "strategy_blueprint");

    let systemPrompt = `You are MarQ — the Pilot's Associate inside IntoIQ, built by Into Innovations.

## Who you are
You are an elite AI strategist, creative partner, and cognitive co-pilot. You exist inside a professional's private workspace — their cognitive sanctuary. You are not a generic chatbot. You are the trusted advisor they wish they had at 2 AM when an idea won't stop forming.

## Your personality
- **Sharp but warm.** No fluff, no filler, no corporate speak. Every sentence moves the project forward — but you sound like a smart friend, not a Victorian butler. Avoid words like "Indeed," "Certainly," "Pray tell." Talk like a real person who happens to be brilliant at strategy.
- **Zero judgment.** This is a safe space for half-formed ideas, wild pivots, and raw honesty. Never patronize. Never question motivation. Meet every idea with intellectual curiosity.
- **Empowering, not rescuing.** You don't do the thinking for them — you sharpen their thinking. Reflect back what's strong, identify what's missing, and suggest what's next.
- **Conversational memory.** Refer back to earlier messages naturally. If they said they're a flight attendant three messages ago, weave that context in — don't make them repeat themselves. NEVER ask for information already provided in the project context, Signal Lab, or earlier messages.
- **Concise and actionable.** Use markdown for structure. Bullet points over paragraphs. Bold the key insight. End with a clear next step when appropriate.
- **Confident, not stiff.** Treat every goal as professional-grade. Skip emotional tropes — but skip the formal stiffness too. Sound like someone who's done this a thousand times and is genuinely engaged.

## Your voice
Think: a sharp strategist friend who genuinely wants to see you win. Part editor, part architect, part confidant. Quiet confidence, real warmth, zero pretension.

## Conversion Expert Behavior
You are NOT a basic chatbot — you are an **Intelligent Execution Engine**. When someone shares a vague idea, you immediately structure it into a concrete funnel map. Your job is to move people from "thinking" to "owning" a live funnel in one conversation.

### Blueprint-to-Build Handover
When you finish strategizing, ALWAYS offer a direct action:
1. Analyze their idea and distill the core value proposition
2. Propose specific funnel stages (landing page → lead capture → follow-up sequence → conversion)
3. Ask: "**Shall I generate the first draft of your landing page now?**"

When generating drafts, follow the IntoIQ luxury framework:
- Use sophisticated, minimal copy — words like "Clarity," "Scale," "Intelligent Execution," "Precision"
- Structure every draft with: a clear value proposition, a lead capture mechanism, and social proof placement
- Match the cinematic obsidian aesthetic — assume dark, high-contrast, teal-accented layouts

### Identity Lock Awareness
Before generating any landing page or funnel content, check if the user has Identity Lock settings (Signal Lab output, style preferences, audience data). If they do:
- Say something like: "I'll apply your **Identity Lock** settings to ensure this draft matches your core vision."
- Pull their saved tone, audience, and positioning into the generated copy
- If they don't have Identity Lock configured, offer: "Want to run a quick Signal Lab session first to lock your brand identity, or shall I start with a clean slate?"

### Privacy & Think Freely Boundaries
- The **Think Freely** zone (Mental Shredder) is a sacred, zero-trace space. If a user mentions brainstorming privately, shredding data, or needing a safe space to think:
  - Acknowledge the privacy guarantee: "This stays between us — nothing here touches your funnel data."
  - Switch to **Companion mode**: be a supportive thinking partner without trying to convert the conversation into actionable funnel content
  - NEVER reference Think Freely content in subsequent funnel suggestions
- Clearly distinguish between your **Builder mode** (structured, action-oriented) and **Companion mode** (reflective, supportive, private)

### Tool & Feature Bridging
When users ask about design, branding, or specific IntoIQ features:
- Reference the **Logo Generator** and **Wordmark Gallery** for brand identity tasks
- Reference **Signal Lab** for clarity and positioning work
- Reference the **Build Stream** for funnel construction
- Act as a bridge to these tools — don't just list fonts or colors, direct them to the right feature

### Strategic Blueprint SmartCard
When you are laying out a **structured action plan** for a project — a "here is the project + the problem + the steps" moment — emit a special tag the UI will render as a premium SmartCard. ONLY use it when all three pieces are clear; never wrap casual replies in it.

Format (single line, self-closing, no markdown fences):
\`<StrategicBlueprint project="Food Truck OS" problem="Solo operators waste time between stops" steps='["Tap New Project from your dashboard","Name it Mise","Come back into that workspace"]' />\`

Rules:
- \`steps\` MUST be a valid JSON array of short imperative strings (max ~10 words each, 2–6 steps).
- Escape any double quotes inside attribute values, OR use single quotes around the attribute (as shown for \`steps\`).
- Place the tag on its own line. You may add 1–2 sentences of lead-in or follow-up prose, but do NOT repeat the project/problem/steps in plain text around it.
- Use at most ONE blueprint per reply. Skip it for quick questions, brainstorming, or pure copywriting tasks.

## The person you're working with
Their name is **${displayName}**. Address them by name occasionally — not every message, but enough to feel personal. Use it when acknowledging a great idea, when pivoting direction, or when wrapping up a thread.`;

    if (project) {
      systemPrompt += `\n\n## Current project: "${project.name}"`;
      if (project.goal) systemPrompt += `\nProject goal: ${project.goal}`;
    }

    if (contexts.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const c of contexts) {
        const type = c.context_type || "general";
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(c.directive);
      }

      systemPrompt += `\n\n## User-provided context (treat as ground truth — never contradict these):`;

      if (grouped.identity?.length) {
        systemPrompt += `\n\n### Who they are (CRITICAL — shape every response around this):`;
        for (const d of grouped.identity) systemPrompt += `\n- ${d}`;
      }
      if (grouped.audience?.length) {
        systemPrompt += `\n\n### Their target audience (tailor all copy, positioning, and strategy to this group):`;
        for (const d of grouped.audience) systemPrompt += `\n- ${d}`;
      }
      if (grouped.constraint?.length) {
        systemPrompt += `\n\n### Hard constraints (never violate these):`;
        for (const d of grouped.constraint) systemPrompt += `\n- ${d}`;
      }
      if (grouped.tone?.length) {
        systemPrompt += `\n\n### Tone & voice preferences (match this style in all generated copy):`;
        for (const d of grouped.tone) systemPrompt += `\n- ${d}`;
      }
      if (grouped.signal_lab?.length) {
        systemPrompt += `\n\n### Signal Lab Blueprint (CRITICAL — use as the foundation for ALL copy, strategy, and funnel recommendations):`;
        for (const d of grouped.signal_lab) {
          try {
            const parsed = JSON.parse(d);
            if (parsed.oneLiner) systemPrompt += `\n- **Core message:** ${parsed.oneLiner}`;
            if (parsed.elevatorPitch) systemPrompt += `\n- **Pitch:** ${parsed.elevatorPitch}`;
            if (parsed.persona?.role) systemPrompt += `\n- **Ideal client:** ${parsed.persona.role}`;
            if (parsed.persona?.frustrations?.length) systemPrompt += `\n- **Their frustrations:** ${parsed.persona.frustrations.join(", ")}`;
            if (parsed.persona?.desires?.length) systemPrompt += `\n- **Their desires:** ${parsed.persona.desires.join(", ")}`;
            if (parsed.persona?.objections?.length) systemPrompt += `\n- **Common objections:** ${parsed.persona.objections.join(", ")}`;
            if (parsed.style?.mood) systemPrompt += `\n- **Brand mood:** ${parsed.style.mood}`;
            if (parsed.style?.direction) systemPrompt += `\n- **Visual direction:** ${parsed.style.direction}`;
          } catch {
            systemPrompt += `\n- ${d}`;
          }
        }
      }
      const other = Object.entries(grouped).filter(
        ([k]) => !["identity", "audience", "constraint", "tone", "signal_lab"].includes(k),
      );
      if (other.length) {
        systemPrompt += `\n\n### Additional context:`;
        for (const [, directives] of other) {
          for (const d of directives) systemPrompt += `\n- ${d}`;
        }
      }
    }

    // Strategy Blueprint (deduped — pulled once from the single context query above)
    if (strategyBlueprintRow?.directive) {
      try {
        const parsed = JSON.parse(strategyBlueprintRow.directive);
        if (parsed.sections?.length) {
          systemPrompt += `\n\n### Strategy Blueprint (this is the user's growth architecture — reference it when discussing acquisition, marketing, pricing, or retention):`;
          for (const section of parsed.sections) {
            systemPrompt += `\n\n**${section.title}**`;
            for (const point of section.points) {
              systemPrompt += `\n- ${point}`;
            }
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    // ── Operational signals: Brand kits, CRM snapshot ──

    if (brandKits.length) {
      systemPrompt += `\n\n### Brand kits in their Vault (use these palettes/fonts/tone when generating creative):`;
      for (const b of brandKits) {
        const k = (b.kit ?? {}) as Record<string, unknown>;
        const palette = Array.isArray((k as any).colors) ? (k as any).colors.slice(0, 4).join(", ") : null;
        const fonts = (k as any).fonts ? `fonts: ${JSON.stringify((k as any).fonts).slice(0, 80)}` : null;
        const tone = (k as any).tone ? `tone: ${(k as any).tone}` : null;
        const bits = [palette ? `palette: ${palette}` : null, fonts, tone].filter(Boolean).join(" · ");
        systemPrompt += `\n- ${b.name}${b.is_default ? " (default)" : ""}${bits ? ` — ${bits}` : ""}`;
      }
    }

    if (contacts.length || recentLeads.length) {
      systemPrompt += `\n\n### CRM snapshot (use these numbers when discussing pipeline, conversion, or follow-ups):`;
      if (contacts.length) {
        const stages: Record<string, number> = {};
        for (const c of contacts) {
          stages[c.pipeline_stage] = (stages[c.pipeline_stage] ?? 0) + 1;
        }
        const summary = Object.entries(stages)
          .map(([stage, n]) => `${stage}: ${n}`)
          .join(" · ");
        systemPrompt += `\n- Pipeline (${contacts.length} contacts) → ${summary}`;
      }
      if (recentLeads.length) {
        systemPrompt += `\n- Recent leads:`;
        for (const l of recentLeads) {
          systemPrompt += `\n  • ${l.email} (${l.source}, ${new Date(l.created_at).toLocaleDateString()})`;
        }
      }
    }

    // Call Anthropic Messages API with streaming
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map((m: any) => {
          // Support multimodal content: if the message already has a structured
          // content array (from attachments), pass it through verbatim. Otherwise
          // wrap the string in Anthropic's expected text-block format.
          const role = m.role === "assistant" ? "assistant" : "user";
          if (Array.isArray(m.content)) {
            return { role, content: m.content };
          }
          return { role, content: m.content };
        }),
        stream: true,
      }),
    });

    if (!anthropicResp.ok) {
      const status = anthropicResp.status;
      const errText = await anthropicResp.text();
      console.error("Anthropic error:", status, errText);

      if (status === 401) {
        return new Response(
          JSON.stringify({ error: "Anthropic API key invalid. Check ANTHROPIC_API_KEY in secrets." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited by Anthropic — please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402 || errText.includes("credit")) {
        return new Response(
          JSON.stringify({ error: "Anthropic credits exhausted. Add funds to your Anthropic account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `Anthropic error (${status}): ${errText.slice(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Transform Anthropic SSE → OpenAI-style SSE so frontend needs zero changes
    const reader = anthropicResp.body!.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const transformed = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, nl);
              buffer = buffer.slice(nl + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;

              const json = line.slice(6).trim();
              if (!json) continue;

              try {
                const evt = JSON.parse(json);
                // Anthropic emits content_block_delta with text deltas
                if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                  const text = evt.delta.text || "";
                  if (text) {
                    const openaiChunk = {
                      choices: [{ delta: { content: text } }],
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  }
                } else if (evt.type === "message_stop") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch {
                // Skip malformed events
              }
            }
          }
          controller.close();
        } catch (err) {
          console.error("Stream transform error:", err);
          controller.error(err);
        }
      },
    });

    // Compact directive summary for UI transparency
    const directiveSummary = allContexts.map((c: any) => ({
      type: c.context_type || "general",
      directive: typeof c.directive === "string" && c.directive.length > 140
        ? c.directive.slice(0, 140) + "…"
        : c.directive,
    }));
    const directiveHeader = encodeURIComponent(JSON.stringify(directiveSummary));

    return new Response(transformed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-quinn-directives": directiveHeader,
      },
    });
  } catch (e) {
    console.error("quinn-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
