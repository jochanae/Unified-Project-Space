import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.BILL_OPTIMIZER);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limited user ${user.id} for bill-optimizer`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const { bills } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Analyzing bills for optimization:", bills?.length || 0, "bills for user:", user.id);

    // Prepare bill summary for AI analysis
    const billSummary = bills?.map((bill: any) => ({
      name: bill.name,
      amount: bill.amount,
      category: bill.category,
      frequency: bill.frequency,
      is_recurring: bill.is_recurring,
    })) || [];

    const totalMonthly = billSummary.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    const categories = [...new Set(billSummary.map((b: any) => b.category))];

    const systemPrompt = `You are a personal finance expert specializing in bill optimization and cost reduction. Your job is to analyze a user's bills and provide actionable suggestions to save money.

Focus on:
1. Bills that can potentially be negotiated (cable, internet, insurance, phone)
2. Subscription services that might be redundant or unused
3. Categories where the user is spending more than typical
4. Seasonal optimization opportunities
5. Bundle deals or alternative providers

Be specific with dollar amounts when possible. Be encouraging but realistic.`;

    const userPrompt = `Analyze these monthly bills and provide optimization suggestions:

Total Monthly Bills: $${totalMonthly.toFixed(2)}
Categories: ${categories.join(', ')}

Bills:
${billSummary.map((b: any) => `- ${b.name}: $${b.amount} (${b.category}, ${b.frequency})`).join('\n')}

Provide:
1. 3-5 specific actionable suggestions to reduce these bills
2. Estimated potential savings for each suggestion
3. Priority level (high/medium/low) based on effort vs savings
4. Any bills that seem higher than average for their category

Format your response as a helpful, encouraging analysis.`;

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = data.choices?.[0]?.message?.content || "Unable to generate suggestions at this time.";

    console.log("Successfully generated bill optimization suggestions");

    return new Response(JSON.stringify({ 
      suggestions,
      totalMonthly,
      billCount: billSummary.length,
      categories,
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
      },
    });

  } catch (error: unknown) {
    console.error("Error in bill-optimizer function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
