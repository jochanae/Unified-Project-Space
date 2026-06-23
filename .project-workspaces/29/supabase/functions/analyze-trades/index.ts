import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Trade {
  symbol: string;
  trade_type: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  profit_loss: number | null;
  status: string;
  notes: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { trades, analysisType = "overview" } = body;

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      throw new Error("No trades provided for analysis");
    }

    // Limit trades array size to prevent resource exhaustion
    if (trades.length > 500) {
      throw new Error("Too many trades. Maximum 500 trades per analysis.");
    }

    // Validate analysisType
    const validTypes = ["overview", "patterns", "improvement", "risk"];
    const safeAnalysisType = validTypes.includes(analysisType) ? analysisType : "overview";

    // Build trade summary for AI
    const closedTrades = trades.filter((t: Trade) => t.status === "closed" && t.profit_loss !== null);
    if (closedTrades.length === 0) {
      return new Response(
        JSON.stringify({ analysis: "You don't have any closed trades yet. Close some trades to get AI-powered analysis and insights!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wins = closedTrades.filter((t: Trade) => (t.profit_loss ?? 0) > 0);
    const losses = closedTrades.filter((t: Trade) => (t.profit_loss ?? 0) < 0);
    const totalPnL = closedTrades.reduce((sum: number, t: Trade) => sum + (t.profit_loss ?? 0), 0);
    const winRate = (wins.length / closedTrades.length) * 100;
    const avgWin = wins.length > 0 ? wins.reduce((sum: number, t: Trade) => sum + (t.profit_loss ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum: number, t: Trade) => sum + (t.profit_loss ?? 0), 0) / losses.length) : 0;

    // Get recent trades for detailed analysis
    const recentTrades = closedTrades
      .sort((a: Trade, b: Trade) => new Date(b.exit_date || b.entry_date).getTime() - new Date(a.exit_date || a.entry_date).getTime())
      .slice(0, 10);

    const tradesSummary = recentTrades.map((t: Trade) => 
      `${t.symbol} (${t.trade_type}): Entry $${t.entry_price} → Exit $${t.exit_price}, P&L: $${t.profit_loss?.toFixed(2)}, Notes: ${t.notes || 'None'}`
    ).join("\n");

    const systemPrompt = `You are Quinn, an expert AI trading mentor. Analyze the user's trading performance and provide actionable, personalized feedback. Be encouraging but honest. Use specific numbers from their data. Keep responses focused and practical.

Key personality traits:
- Warm and supportive, like a wise mentor
- Data-driven but explains concepts simply
- Focuses on continuous improvement
- Celebrates wins while identifying areas for growth`;

    const userPrompt = `Analyze my trading performance and give me actionable feedback.

**My Trading Stats:**
- Total Closed Trades: ${closedTrades.length}
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}
- Risk/Reward Ratio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A'}

**Recent Trades:**
${tradesSummary}

${safeAnalysisType === "patterns" ? "Focus on identifying patterns in my winning vs losing trades." : ""}
${safeAnalysisType === "improvement" ? "Focus on specific areas where I can improve my trading." : ""}
${safeAnalysisType === "risk" ? "Focus on my risk management and position sizing." : ""}

Provide a structured analysis with:
1. **Overall Assessment** (2-3 sentences)
2. **What's Working Well** (2-3 bullet points)
3. **Areas for Improvement** (2-3 bullet points with specific suggestions)
4. **Action Items** (1-2 specific things to try next)`;

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
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI analysis");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "Unable to generate analysis at this time.";

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-trades error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
