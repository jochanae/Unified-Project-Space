import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { COACH_TOOLS } from "./tools.ts";
import { executeToolCall } from "./tool-executor.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { persistBlueprintCards } from "./blueprint-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOOM_COACH_DAILY_LIMIT = 3;
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authenticated user:", user.id);

    // Create user-scoped client for RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Check if user is admin/moderator/super_admin (unlimited access)
    const { data: rolesData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const userRoles = rolesData?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin') || userRoles.includes('moderator') || userRoles.includes('super_admin');
    
    // Check if user has premium subscription (unlimited access)
    let isPremium = isAdmin;
    if (!isAdmin) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey && user.email) {
        try {
          const Stripe = (await import("https://esm.sh/stripe@18.5.0")).default;
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length > 0) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: "active",
              limit: 1,
            });
            isPremium = subscriptions.data.length > 0;
          }
        } catch (stripeError) {
          console.log("Stripe check failed, defaulting to free tier:", stripeError);
        }
      }
    }
    
    // If not premium, check and enforce daily limit
    if (!isPremium) {
      const { data: usageResult, error: usageError } = await supabaseAdmin.rpc('check_and_increment_usage', {
        p_user_id: user.id,
        p_feature_name: 'bloom-coach',
        p_daily_limit: BLOOM_COACH_DAILY_LIMIT
      });
      
      if (usageError) {
        console.log("Usage check error:", usageError);
      } else if (usageResult && !usageResult.can_use) {
        return new Response(JSON.stringify({ 
          error: "Daily limit reached",
          limit_info: usageResult,
          upgrade_message: "You've used your 3 free Bloom messages for today. Upgrade to Premium for unlimited access!"
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { messages, category, projectContext, mode, privateMode: privateModeRaw, conversationId: convoIdRaw, allowedAccountIds: allowedAccountIdsRaw } = await req.json();
    const privateMode: boolean = privateModeRaw === true;
    const conversationId: string | null = typeof convoIdRaw === "string" ? convoIdRaw : null;
    // Data Context filter: when user has narrowed the listening set in Quinn's
    // Brain, only those account IDs are visible to Quinn. Empty array = "all".
    const allowedAccountIds: string[] = Array.isArray(allowedAccountIdsRaw)
      ? allowedAccountIdsRaw.filter((x: unknown) => typeof x === "string").slice(0, 50)
      : [];
    const hasAccountFilter = allowedAccountIds.length > 0;

    // Validate / sanitize project context coming from the client
    let safeProjectContext: { id: string; title: string; goal?: string; lens?: string } | null = null;
    if (projectContext && typeof projectContext === "object") {
      const id = typeof projectContext.id === "string" ? projectContext.id.slice(0, 80) : "";
      const title = typeof projectContext.title === "string" ? projectContext.title.slice(0, 120) : "";
      if (id && title) {
        safeProjectContext = {
          id,
          title,
          goal: typeof projectContext.goal === "string" ? projectContext.goal.slice(0, 240) : undefined,
          lens: typeof projectContext.lens === "string" ? projectContext.lens.slice(0, 32) : undefined,
        };
      }
    }
    if (safeProjectContext) {
      console.log("Quinn project context:", safeProjectContext.title);
    }

    // Validate / sanitize mode chip — must be one of the known personas
    const ALLOWED_MODES = ["focus", "brainstorm", "planner", "audit", "strategic"] as const;
    type AllowedMode = typeof ALLOWED_MODES[number];
    const safeMode: AllowedMode | null =
      typeof mode === "string" && (ALLOWED_MODES as readonly string[]).includes(mode)
        ? (mode as AllowedMode)
        : null;
    if (safeMode) {
      console.log("Quinn mode:", safeMode);
    }
    
    // Fetch user profile, financial data, and advice history in parallel
    const [
      profileRes,
      accountsRes, goalsRes, debtsRes, billsRes, budgetsRes, coachProfileRes,
      adviceHistoryRes, plansRes,
      pinnedCardsRes, recentCardsRes,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
      (hasAccountFilter
        ? supabaseAdmin.from("accounts").select("id, name, balance, account_type").eq("user_id", user.id).in("id", allowedAccountIds).limit(50)
        : supabaseAdmin.from("accounts").select("id, name, balance, account_type").eq("user_id", user.id).limit(5)),
      supabaseAdmin.from("goals").select("title, current_amount, target_amount").eq("user_id", user.id).eq("is_archived", false).limit(3),
      supabaseAdmin.from("debts").select("name, current_balance, interest_rate").eq("user_id", user.id).eq("status", "active").limit(3),
      supabaseAdmin.from("bills").select("name, amount, status, due_date").eq("user_id", user.id).eq("status", "pending").limit(5),
      supabaseAdmin.from("budgets").select("name, amount, spent, category").eq("user_id", user.id).eq("is_active", true).limit(5),
      supabaseAdmin.from("bloom_coach_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabaseAdmin.from("bloom_advice_history").select("topic, conclusion, conditions, created_at").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("bloom_financial_plans").select("title, plan_type, status, target_amount, current_amount").eq("user_id", user.id).eq("status", "active").limit(5),
      // Phase 3.5 — Strategic Cockpit: pinned blueprint cards (North Star)
      supabaseAdmin.from("quinn_blueprint_cards")
        .select("title, summary, mode_lens, project_id, promoted_to_plan_id, created_at, card_data")
        .eq("user_id", user.id).eq("is_pinned", true)
        .order("updated_at", { ascending: false }).limit(5),
      // Phase 3.5 — Recent Work: latest unpinned blueprint cards
      supabaseAdmin.from("quinn_blueprint_cards")
        .select("title, summary, mode_lens, project_id, promoted_to_plan_id, created_at")
        .eq("user_id", user.id).eq("is_pinned", false)
        .order("created_at", { ascending: false }).limit(5),
    ]);
    
    const profile = profileRes.data;
    const userName = profile?.first_name || user.user_metadata?.first_name || user.email?.split("@")[0] || "Friend";
    const totalBalance = accountsRes.data?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;
    const totalDebt = debtsRes.data?.reduce((sum, d) => sum + (d.current_balance || 0), 0) || 0;
    const pendingBillsCount = billsRes.data?.length || 0;
    const pendingBillsTotal = billsRes.data?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
    
    // Build "Bloom Knows Me" context from profile
    const coachProfile = coachProfileRes.data;
    let personalContext = "";
    if (coachProfile && coachProfile.is_complete) {
      const parts: string[] = [];
      if (coachProfile.age_range) parts.push(`Age: ${coachProfile.age_range}`);
      if (coachProfile.employment_type) parts.push(`Employment: ${coachProfile.employment_type}`);
      if (coachProfile.family_status) parts.push(`Family: ${coachProfile.family_status}`);
      if (coachProfile.income_range && coachProfile.income_range !== "prefer-not") parts.push(`Income range: ${coachProfile.income_range}`);
      if (coachProfile.financial_literacy) parts.push(`Financial knowledge: ${coachProfile.financial_literacy}`);
      if (coachProfile.biggest_challenge?.length) parts.push(`Biggest challenges: ${coachProfile.biggest_challenge.join(", ")}`);
      if (coachProfile.risk_tolerance) parts.push(`Risk tolerance: ${coachProfile.risk_tolerance}`);
      if (coachProfile.top_financial_goals?.length) parts.push(`Top goals: ${coachProfile.top_financial_goals.join(", ")}`);
      if (coachProfile.coaching_style) parts.push(`Preferred coaching style: ${coachProfile.coaching_style}`);
      personalContext = `\nPersonal Profile (Bloom Knows Me):\n- ${parts.join("\n- ")}`;
    }

    const financialContext = `
User Context:
- Name: ${userName}
- Total account balance: $${totalBalance.toLocaleString()}
- Active debts: ${debtsRes.data?.length || 0} (Total: $${totalDebt.toLocaleString()})
- Pending bills: ${pendingBillsCount} (Total: $${pendingBillsTotal.toLocaleString()})
- Bills due soon: ${billsRes.data?.map(b => `${b.name}: $${b.amount} due ${b.due_date}`).join(", ") || "None"}
- Savings goals: ${goalsRes.data?.map(g => `${g.title}: $${g.current_amount}/$${g.target_amount}`).join(", ") || "None set"}
- Active budgets: ${budgetsRes.data?.map(b => `${b.name}: $${b.spent}/$${b.amount}`).join(", ") || "None"}
- Accounts: ${accountsRes.data?.map(a => `${a.name} (${a.account_type}): $${a.balance}`).join(", ") || "None"}
- Active financial plans: ${plansRes.data?.map(p => `${p.title} (${p.plan_type})`).join(", ") || "None"}
${personalContext}

Today's date: ${new Date().toISOString().split('T')[0]}
`;

    const coachingStyleInstruction = coachProfile?.coaching_style === "motivational"
      ? "Be highly motivational and encouraging. Celebrate wins, use positive reinforcement, and keep energy high."
      : coachProfile?.coaching_style === "direct"
      ? "Be direct and straightforward. Give clear, no-nonsense advice without fluff."
      : coachProfile?.coaching_style === "detailed"
      ? "Provide detailed explanations with examples. Break down complex concepts thoroughly."
      : "Balance encouragement with honest, practical advice.";

    // Build advice history string for prompt injection
    let adviceHistoryStr = "";
    if (adviceHistoryRes.data && adviceHistoryRes.data.length > 0) {
      adviceHistoryStr = adviceHistoryRes.data.map(a => 
        `- [${a.created_at?.split('T')[0]}] ${a.topic}: ${a.conclusion}${a.conditions ? ` (Conditions: ${a.conditions})` : ''}`
      ).join('\n');
    }

    // Phase 3.5 — Strategic Cockpit: build pinned + recent blueprint context
    let strategicCockpit = "";
    const pinned = pinnedCardsRes.data || [];
    const recent = recentCardsRes.data || [];
    if (pinned.length > 0 || recent.length > 0) {
      const fmtCard = (c: any, includeSummary = true) => {
        const lens = c.mode_lens ? ` [${c.mode_lens}]` : "";
        const promoted = c.promoted_to_plan_id ? " ✓promoted-to-plan" : "";
        const scoped = safeProjectContext && c.project_id === safeProjectContext.id ? " (this project)" : "";
        const summary = includeSummary && c.summary ? ` — ${String(c.summary).slice(0, 220)}` : "";
        return `- "${c.title}"${lens}${scoped}${promoted}${summary}`;
      };
      const northStar = pinned.length > 0
        ? `\n### 🌟 North Star — Pinned Blueprints (treat as established strategy; do not contradict without flagging the change)\n${pinned.map((c) => fmtCard(c, true)).join("\n")}\n`
        : "";
      const recentWork = recent.length > 0
        ? `\n### 🕒 Recent Strategic Work (reference only if relevant)\n${recent.map((c) => fmtCard(c, false)).join("\n")}\n`
        : "";
      strategicCockpit = `\n## STRATEGIC COCKPIT (CRITICAL CONTEXT)\nThese are blueprints you've previously co-created with the user. Anchor new advice to them. When updating or evolving a pinned blueprint, explicitly say so ("Building on our Brokerage Consolidation blueprint…").\n${northStar}${recentWork}`;
    }

    // Phase 3 — Living Memory: pull top memories per tier, ranked by current_score
    let memoryBlock = "";
    let topMemoryIds: string[] = [];
    if (!privateMode) {
      const { data: mems } = await supabaseAdmin
        .from("quinn_memories")
        .select("id, tier, topic, content, current_score, emotional_weight")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("current_score", { ascending: false })
        .limit(40);

      if (mems && mems.length > 0) {
        const grouped: Record<string, typeof mems> = {
          foundational: [], identity: [], episodic: [], contextual: [], transient: [],
        };
        for (const m of mems) {
          if (grouped[m.tier]) grouped[m.tier].push(m);
        }
        const tierLimits: Record<string, number> = {
          foundational: 6, identity: 6, episodic: 4, contextual: 5, transient: 2,
        };
        const tierLabels: Record<string, string> = {
          foundational: "🌳 Foundational (core values — never contradict)",
          identity: "🧬 Identity (stable life facts)",
          episodic: "📍 Episodic (past financial events)",
          contextual: "🔄 Contextual (currently in-flight)",
          transient: "💭 Transient (recent mood / short-term)",
        };
        const tierOrder = ["foundational", "identity", "episodic", "contextual", "transient"];
        const blocks: string[] = [];
        for (const tier of tierOrder) {
          const slice = grouped[tier].slice(0, tierLimits[tier]);
          if (!slice.length) continue;
          const lines = slice.map((m) => {
            topMemoryIds.push(m.id);
            const ew = m.emotional_weight > 0 ? " ⬆" : m.emotional_weight < 0 ? " ⬇" : "";
            return `- ${m.topic}${ew}: ${m.content}`;
          }).join("\n");
          blocks.push(`### ${tierLabels[tier]}\n${lines}`);
        }
        if (blocks.length) {
          memoryBlock = `\n## QUINN'S LIVING MEMORY (CRITICAL — pulled from her 5-tier memory of this user)\nUse these to keep continuity. Reference them naturally ("I remember you mentioned..."). Do not invent facts beyond what's listed. If a transient memory contradicts a foundational/identity one, trust the higher tier.\n\n${blocks.join("\n\n")}\n`;
        }
      }
    }

    // ── Quinn State Engine ────────────────────────────────────────────────────
    // Computed every turn before prompt assembly. Axes: Discipline × Stability × Emotion
    // Result is injected into the system prompt to bind response length, tone, and tool usage.

    // 1. Financial Stability axis — derived from real data
    let stabilityAxis: "fragile" | "stable" | "surplus" = "stable";
    const debtRatio = totalBalance > 0 ? totalDebt / totalBalance : 1;
    const billPressure = totalBalance > 0 ? pendingBillsTotal / totalBalance : 1;
    if (totalBalance < 500 || debtRatio > 0.8 || billPressure > 0.4) {
      stabilityAxis = "fragile";
    } else if (totalBalance > 15000 && debtRatio < 0.1 && pendingBillsCount === 0) {
      stabilityAxis = "surplus";
    }

    // 2. Emotional State axis — derived from latest user message language
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const lastUserText = (lastUserMsg?.content ?? "").toLowerCase();
    const distressSignals = ["stressed", "stress", "worried", "worry", "scared", "overwhelmed", "behind", "can't", "cant", "failing", "desperate", "help", "lost", "struggling", "stuck", "anxious", "panic", "bad", "terrible", "horrible"];
    const confidenceSignals = ["ready", "excited", "great", "doing well", "want to", "finally", "level up", "growing", "on track", "stable", "good place", "ahead"];
    let emotionAxis: "distressed" | "neutral" | "confident" = "neutral";
    if (distressSignals.some(s => lastUserText.includes(s))) {
      emotionAxis = "distressed";
    } else if (confidenceSignals.some(s => lastUserText.includes(s))) {
      emotionAxis = "confident";
    }

    // 3. Discipline axis — derived from message patterns and data
    const lowDisciplineSignals = ["forgot", "missed", "skipped", "couldn't", "didn't", "keep forgetting", "hard to", "always late"];
    const highDisciplineSignals = ["consistent", "always", "automated", "habit", "every month", "been doing", "on schedule"];
    let disciplineAxis: "low" | "emerging" | "high" = "emerging";
    const allUserText = messages.filter((m: any) => m.role === "user").map((m: any) => (m.content ?? "").toLowerCase()).join(" ");
    if (highDisciplineSignals.some(s => allUserText.includes(s))) {
      disciplineAxis = "high";
    } else if (lowDisciplineSignals.some(s => allUserText.includes(s))) {
      disciplineAxis = "low";
    }

    // 4. Escalation Level — condition-based (not message count alone)
    const priorAssistantMessages = messages.filter((m: any) => m.role === "assistant");
    const hasFinancialData = (accountsRes.data?.length ?? 0) > 0 || (debtsRes.data?.length ?? 0) > 0 || (budgetsRes.data?.length ?? 0) > 0;
    const urgencySignals = ["behind", "stressed", "urgent", "need to", "asap", "immediately", "can't wait"];
    const hasUrgency = urgencySignals.some(s => lastUserText.includes(s));
    const hasBudgetOrSystem = (budgetsRes.data?.length ?? 0) > 0 || (plansRes.data?.length ?? 0) > 0;
    const isFirstInteraction = priorAssistantMessages.length === 0;
    const turnCount = priorAssistantMessages.length;

    let escalationLevel: 1 | 2 | 3 | 4 | 5 = 1;
    if (isFirstInteraction || !hasFinancialData) {
      escalationLevel = 1;
    } else if (hasFinancialData && (turnCount >= 2 || emotionAxis === "distressed")) {
      escalationLevel = 2;
    }
    if (hasFinancialData && (hasUrgency || turnCount >= 3)) {
      escalationLevel = 3;
    }
    if (hasBudgetOrSystem && stabilityAxis !== "fragile" && emotionAxis !== "distressed" && turnCount >= 3) {
      escalationLevel = 4;
    }
    if (stabilityAxis === "surplus" && hasBudgetOrSystem && disciplineAxis === "high") {
      escalationLevel = 5;
    }
    // De-escalation: overwhelm or confusion signals drop one level
    const overwhelmSignals = ["too much", "confused", "don't understand", "overwhelmed", "slow down", "what does that mean"];
    if (overwhelmSignals.some(s => lastUserText.includes(s)) && escalationLevel > 1) {
      escalationLevel = (escalationLevel - 1) as 1 | 2 | 3 | 4 | 5;
    }

    const quinnState = {
      discipline: disciplineAxis,
      stability: stabilityAxis,
      emotion: emotionAxis,
      escalation: escalationLevel,
      isFirstTurn: isFirstInteraction,
    };

    const systemPrompt = buildSystemPrompt(userName, financialContext + strategicCockpit + memoryBlock, coachingStyleInstruction, adviceHistoryStr, safeProjectContext, safeMode, quinnState);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build conversation with tool calling
    const conversationMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Phase 1: Non-streaming call for tool resolution
    const toolResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: conversationMessages,
        tools: COACH_TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!toolResponse.ok) {
      const status = toolResponse.status;
      const errorText = await toolResponse.text();
      console.error("AI gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let completion = await toolResponse.json();
    let assistantMessage = completion.choices[0].message;
    
    // Process tool calls if any (loop until no more tool calls)
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.length);
      
      const toolResults: Array<{ tool_call_id: string; result: string }> = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, unknown> = {};
        
        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }
        
        const result = await executeToolCall(supabase, user.id, toolName, toolArgs);
        toolResults.push({
          tool_call_id: toolCall.id,
          result: JSON.stringify(result),
        });
        
        console.log(`Tool ${toolName} result:`, result.message);
      }
      
      // Add assistant message and tool results to conversation
      conversationMessages.push(assistantMessage);
      for (const tr of toolResults) {
        conversationMessages.push({
          role: "tool",
          tool_call_id: tr.tool_call_id,
          content: tr.result,
        });
      }
      
      // Get next response (non-streaming, may have more tool calls)
      const followUpResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: conversationMessages,
          tools: COACH_TOOLS,
          tool_choice: "auto",
        }),
      });
      
      if (!followUpResponse.ok) {
        console.error("Follow-up API error:", await followUpResponse.text());
        break;
      }
      
      completion = await followUpResponse.json();
      assistantMessage = completion.choices[0].message;
    }

    // Phase 2: Deliver the final response
    // If we already have content from tool resolution, fake-stream it
    if (assistantMessage.content) {
      console.log("Fake-streaming resolved content, length:", assistantMessage.content.length);
      // Persist any :::card blocks Quinn emitted (fire-and-forget)
      // Mental Shredder: only persist blueprint cards in normal mode
      if (!privateMode) {
        persistBlueprintCards(supabaseAdmin, user.id, assistantMessage.content, safeProjectContext, safeMode)
          .catch((err: unknown) => console.error("Blueprint card persist failed:", err));
      }

      // Phase 3 — Living Memory: bump referenced memories + trigger background extraction
      if (!privateMode) {
        if (topMemoryIds.length > 0) {
          supabaseAdmin
            .from("quinn_memories")
            .update({ last_referenced_at: new Date().toISOString() })
            .in("id", topMemoryIds)
            .then(({ error }) => { if (error) console.error("Memory bump failed:", error); });
        }
        const extractMessages = [
          ...messages,
          { role: "assistant", content: assistantMessage.content },
        ];
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-memories`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: extractMessages,
            conversationId,
            projectId: safeProjectContext?.id ?? null,
          }),
        }).catch((err) => console.error("Memory extraction trigger failed:", err));
      }

      return createFakeStream(assistantMessage.content, corsHeaders);
    }

    // No content yet and no tool calls — stream directly from scratch
    const streamResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const errorText = await streamResponse.text();
      console.error("Stream error:", streamResponse.status, errorText);
      
      if (streamResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (streamResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Bloom chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Fallback for when real streaming fails but we have content
function createFakeStream(content: string, headers: Record<string, string>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const chunks = content.match(/.{1,40}/g) || [content];
      let index = 0;
      
      const sendChunk = () => {
        if (index < chunks.length) {
          const data = JSON.stringify({
            choices: [{ delta: { content: chunks[index] }, finish_reason: null }]
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          index++;
          setTimeout(sendChunk, 15);
        } else {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      };
      sendChunk();
    }
  });

  return new Response(stream, {
    headers: { ...headers, "Content-Type": "text/event-stream" },
  });
}
