import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.AI_INSIGHTS);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limited user ${user.id} for ai-insights`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    console.log("Authenticated user:", user.id);

    const { financialData } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional financial advisor AI. Analyze the user's financial data and provide personalized, actionable insights. Be encouraging but honest. Focus on:
1. Spending patterns and areas of concern
2. Savings opportunities
3. Budget optimization tips
4. Specific actionable recommendations
5. Positive trends to celebrate

Format your response with clear sections using markdown:
- **Summary**: Brief overview
- **Key Insights**: 3-5 bullet points
- **Recommendations**: Actionable steps
- **Watch Out**: Areas needing attention
- **Celebrate**: Positive achievements`;

    const userPrompt = `Analyze this financial data and provide insights:

Income: $${financialData.income.toLocaleString()}
Expenses: $${financialData.expenses.toLocaleString()}
Net Cash Flow: $${financialData.netCashFlow.toLocaleString()}
Savings Rate: ${financialData.savingsRate}%
Budget Health: ${financialData.budgetHealth}%

Spending by Category:
${financialData.categories.map((c: any) => `- ${c.name}: $${c.value.toLocaleString()}`).join('\n')}

Budget Status:
- On Track: ${financialData.budgetStats.onTrack} budgets
- Warning: ${financialData.budgetStats.warning} budgets
- Over Budget: ${financialData.budgetStats.overBudget} budgets

Monthly Trend (last 6 months):
${financialData.trendData.map((t: any) => `- ${t.month}: Income $${t.income.toLocaleString()}, Expenses $${t.expenses.toLocaleString()}`).join('\n')}

Goals Progress: $${financialData.goalsData.current.toLocaleString()} of $${financialData.goalsData.target.toLocaleString()} (${financialData.goalsProgress}%)`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/event-stream",
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
