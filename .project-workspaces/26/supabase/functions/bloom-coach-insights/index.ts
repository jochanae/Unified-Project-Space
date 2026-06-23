import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url decode
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[BLOOM-COACH] No authorization header provided');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      console.log('[BLOOM-COACH] Authorization header present but token missing');
      return new Response(JSON.stringify({ error: 'No access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // verify_jwt=true already validates the token before the request reaches this handler.
    // Avoid supabase.auth.getUser() here (can fail in stateless function contexts).
    const payload = decodeJwtPayload(token);
    const userId = typeof payload?.sub === 'string' ? payload.sub : null;

    if (!userId) {
      console.log('[BLOOM-COACH] JWT payload missing sub');
      return new Response(JSON.stringify({ error: 'Session expired', code: 'session_expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.AI_COACH);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limited user ${userId} for bloom-coach-insights`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    console.log('Fetching financial data for user:', userId);

    // Fetch all financial data in parallel
    const [
      { data: accounts },
      { data: budgets },
      { data: goals },
      { data: bills },
      { data: debts },
      { data: transactions },
      { data: creditScores },
    ] = await Promise.all([
      supabaseClient.from('accounts').select('*').eq('user_id', userId),
      supabaseClient.from('budgets').select('*').eq('user_id', userId).eq('is_active', true),
      supabaseClient.from('goals').select('*').eq('user_id', userId).eq('is_archived', false),
      supabaseClient.from('bills').select('*').eq('user_id', userId),
      supabaseClient.from('debts').select('*').eq('user_id', userId).eq('status', 'active'),
      supabaseClient.from('transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }).limit(50),
      supabaseClient.from('credit_scores').select('*').eq('user_id', userId).order('score_date', { ascending: false }).limit(1),
    ]);

    // Calculate financial metrics
    const totalAssets = (accounts || []).filter(a => a.category === 'asset').reduce((sum, a) => sum + Number(a.balance), 0);
    const totalLiabilities = (accounts || []).filter(a => a.category === 'liability').reduce((sum, a) => sum + Number(a.balance), 0);
    const netWorth = totalAssets - totalLiabilities;

    const totalDebt = (debts || []).reduce((sum, d) => sum + Number(d.current_balance), 0);
    const monthlyDebtPayment = (debts || []).reduce((sum, d) => sum + Number(d.minimum_payment), 0);

    const monthlyIncome = (transactions || [])
      .filter(t => t.type === 'income' && new Date(t.transaction_date).getMonth() === new Date().getMonth())
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlyExpenses = (transactions || [])
      .filter(t => t.type === 'expense' && new Date(t.transaction_date).getMonth() === new Date().getMonth())
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome * 100) : 0;
    const dti = monthlyIncome > 0 ? (monthlyDebtPayment / monthlyIncome * 100) : 0;

    const overdueBills = (bills || []).filter(b => 
      b.status !== 'paid' && new Date(b.due_date) < new Date()
    ).length;

    const overBudgetCategories = (budgets || []).filter(b => Number(b.spent) > Number(b.amount));

    const latestCreditScore = creditScores?.[0]?.score || null;

    const financialSummary = {
      netWorth,
      totalAssets,
      totalLiabilities,
      totalDebt,
      monthlyIncome,
      monthlyExpenses,
      savingsRate: savingsRate.toFixed(1),
      dti: dti.toFixed(1),
      overdueBills,
      overBudgetCount: overBudgetCategories.length,
      creditScore: latestCreditScore,
      goalsCount: (goals || []).length,
      goalsProgress: (goals || []).map(g => ({
        title: g.title,
        progress: g.target_amount > 0 ? (g.current_amount / g.target_amount * 100).toFixed(0) : 0
      })),
    };

    console.log('Financial summary:', financialSummary);

    // Generate AI insights using Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are Bloom, a smart money mentor. Analyze this user's financial data and provide actionable insights.

Financial Summary:
- Net Worth: $${financialSummary.netWorth.toLocaleString()}
- Total Assets: $${financialSummary.totalAssets.toLocaleString()}
- Total Liabilities: $${financialSummary.totalLiabilities.toLocaleString()}
- Total Debt: $${financialSummary.totalDebt.toLocaleString()}
- Monthly Income: $${financialSummary.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${financialSummary.monthlyExpenses.toLocaleString()}
- Savings Rate: ${financialSummary.savingsRate}%
- Debt-to-Income Ratio: ${financialSummary.dti}%
- Overdue Bills: ${financialSummary.overdueBills}
- Over-Budget Categories: ${financialSummary.overBudgetCount}
- Credit Score: ${financialSummary.creditScore || 'Not tracked'}
- Active Goals: ${financialSummary.goalsCount}

Provide a JSON response with this exact structure:
{
  "summary": "A brief 1-2 sentence assessment of their overall financial health",
  "insights": ["Array of 2-4 key observations about their finances"],
  "actions": ["Array of 2-4 specific actionable recommendations"],
  "warnings": ["Array of 0-3 urgent issues that need attention (empty if none)"]
}

Be encouraging but honest. Focus on the most impactful advice.`;

    // Add timeout for AI call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    
    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'You are Bloom, a smart money mentor. Always respond with valid JSON only, no markdown.' },
            { role: 'user', content: prompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error (likely timeout):', fetchError);
      throw new Error('AI service timeout - please try again');
    }
    
    clearTimeout(timeoutId);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let parsedInsights;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedInsights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedInsights = {
        summary: `Your net worth is $${financialSummary.netWorth.toLocaleString()}, showing ${financialSummary.netWorth >= 0 ? 'positive' : 'concerning'} financial health.`,
        insights: ['Financial data analyzed', 'Continue tracking your spending'],
        actions: ['Review your budget', 'Set savings goals'],
        warnings: financialSummary.overdueBills > 0 ? [`${financialSummary.overdueBills} overdue bills need attention`] : [],
      };
    }

    return new Response(JSON.stringify({
      ...parsedInsights,
      metrics: financialSummary,
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
    });

  } catch (error) {
    console.error('Error in bloom-coach-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
