import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { tool, data } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    if (tool === "improvement-plan") {
      const { scores, accounts, debts } = data;
      systemPrompt = `You are a credit improvement specialist. Provide actionable, step-by-step credit improvement plans based on the user's financial data. Be specific with timelines, amounts, and expected score impacts. Format with markdown headers and bullet points. Never use fluffy language - be direct and professional.`;
      userPrompt = `Based on my financial profile, create a personalized credit improvement plan:

Credit Scores: ${JSON.stringify(scores || [])}
Credit Accounts: ${JSON.stringify(accounts || [])}
Debts: ${JSON.stringify(debts || [])}

Provide:
1. Score analysis with specific factors impacting my score
2. A prioritized action plan with timeline (30/60/90 day milestones)
3. Specific dollar amounts and percentages to target
4. Expected score improvement estimates per action
5. Quick wins I can do this week`;
    } else if (tool === "card-recommendations") {
      const { scores, spending_habits } = data;
      systemPrompt = `You are a credit card advisor. Recommend specific credit cards based on the user's credit score range and spending patterns. Be direct and practical. Include real card categories and typical benefits. Format with markdown.`;
      userPrompt = `Based on my credit profile, recommend credit cards:

Credit Scores: ${JSON.stringify(scores || [])}
Spending Patterns: ${JSON.stringify(spending_habits || "Not provided")}

Provide:
1. My credit tier and what cards I likely qualify for
2. Top 3 card recommendations by category (cashback, travel, balance transfer)
3. Key benefits and what to look for in each category
4. Cards to avoid at my current score level
5. Strategy for optimizing card applications (timing, hard inquiries)`;
    } else if (tool === "dispute-guidance") {
      const { issue_type, details } = data;
      systemPrompt = `You are a credit dispute specialist. Help users understand their rights under the FCRA and guide them on disputing credit report errors. Be legally accurate but accessible. Format with markdown.`;
      userPrompt = `I need help with a credit report dispute:

Issue Type: ${issue_type || "General"}
Details: ${details || "Not specified"}

Provide:
1. Whether this is a valid dispute and why
2. Which bureau(s) to contact
3. What evidence to gather
4. A step-by-step dispute process
5. Timeline expectations
6. What to do if the dispute is denied`;
    } else {
      throw new Error("Invalid tool type");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("credit-tools error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
