import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hash a token with SHA-256 to match against stored hashes
async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse transaction details using AI
async function parseTransactionFromText(text: string): Promise<{
  amount: number;
  title: string;
  category: string;
  type: 'expense' | 'income';
}> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    // Fallback to simple regex parsing
    const amountMatch = text.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;
    return {
      amount,
      title: "Voice Transaction",
      category: "other",
      type: "expense"
    };
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a financial transaction parser. Extract transaction details from voice commands.

CATEGORIES (choose the most appropriate one):
- food: restaurants, cafes, coffee shops, groceries, dining, fast food
- transportation: gas, uber, lyft, parking, car maintenance, public transit
- shopping: retail stores, Amazon, clothing, electronics
- utilities: electric, water, gas, internet, phone bills
- entertainment: movies, concerts, streaming, games, sports
- healthcare: doctors, pharmacy, medical bills
- education: tuition, books, courses, school supplies
- housing: rent, mortgage, home repairs
- insurance: car, health, home, life insurance
- income: salary, refunds, deposits, payments received
- other: only use if nothing else fits

Always respond with a JSON object containing:
- amount: number (the transaction amount)
- title: string (brief description, max 50 chars)
- category: string (one of the categories above)
- type: "expense" or "income"

If you cannot determine the amount, set it to 0.`
          },
          {
            role: "user",
            content: text
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_transaction",
              description: "Parse the voice command and extract transaction details",
              parameters: {
                type: "object",
                properties: {
                  amount: { type: "number", description: "The transaction amount" },
                  title: { type: "string", description: "Brief description of the transaction" },
                  category: { 
                    type: "string", 
                    enum: ["food", "transportation", "shopping", "utilities", "entertainment", "healthcare", "education", "housing", "insurance", "other", "income"]
                  },
                  type: { type: "string", enum: ["expense", "income"] }
                },
                required: ["amount", "title", "category", "type"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_transaction" } }
      }),
    });

    if (!response.ok) {
      console.error("[IFTTT] AI API error:", await response.text());
      throw new Error("AI parsing failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    
    throw new Error("No tool call response");
  } catch (error) {
    console.error("[IFTTT] AI parsing error:", error);
    // Fallback to simple parsing
    const amountMatch = text.match(/\$?([\d,]+\.?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", "")) : 0;
    return {
      amount,
      title: "Voice Transaction",
      category: "other",
      type: "expense"
    };
  }
}

serve(async (req) => {
  console.log("[IFTTT] Webhook received");
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const body = await req.json();
    console.log("[IFTTT] Request body:", JSON.stringify(body));

    const { token, amount, category, text, source } = body;

    if (!token) {
      console.error("[IFTTT] Missing token");
      return new Response(
        JSON.stringify({ success: false, error: "Missing API token" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the incoming token and look up by hash
    const tokenHash = await hashToken(token);
    
    // Look up user by hashed API token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('user_api_tokens')
      .select('user_id, is_active')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenRecord) {
      console.error("[IFTTT] Invalid token:", tokenError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or inactive API token" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = tokenRecord.user_id;
    console.log("[IFTTT] User found:", userId);

    // Update last_used_at
    await supabase
      .from('user_api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('token_hash', tokenHash);

    // Parse the transaction
    let parsed;
    
    // If amount and category are directly provided (from IFTTT number/text fields)
    if (amount && !isNaN(parseFloat(amount))) {
      parsed = {
        amount: parseFloat(amount),
        title: text || category || "Voice Transaction",
        category: category?.toLowerCase() || "other",
        type: "expense" as const
      };
    } else if (text) {
      // Parse from text using AI
      parsed = await parseTransactionFromText(text);
    } else {
      console.error("[IFTTT] No parseable content");
      return new Response(
        JSON.stringify({ success: false, error: "No transaction data provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[IFTTT] Parsed transaction:", parsed);

    if (parsed.amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not parse transaction amount" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: parsed.amount,
        title: parsed.title,
        type: parsed.type,
        category: parsed.category,
        notes: `Via ${source || 'Smart Speaker'}: ${text || `$${amount} for ${category}`}`,
        transaction_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (txError) {
      console.error("[IFTTT] Transaction insert error:", txError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create transaction" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[IFTTT] Transaction created:", transaction.id);

    // Auto-update budget envelope if this is an expense
    let budgetUpdated = false;
    if (parsed.type === 'expense' && parsed.category) {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('id, name, spent, amount')
        .eq('user_id', userId)
        .eq('category', parsed.category)
        .eq('is_active', true)
        .limit(1);

      if (budgets && budgets.length > 0) {
        const budget = budgets[0];
        const newSpent = Number(budget.spent) + parsed.amount;
        
        await supabase
          .from('budgets')
          .update({ spent: newSpent })
          .eq('id', budget.id);
        
        budgetUpdated = true;
        console.log(`[IFTTT] Updated ${budget.name} budget: +$${parsed.amount}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: budgetUpdated 
          ? `Recorded & budget updated: $${parsed.amount.toFixed(2)} - ${parsed.title}`
          : `Recorded: $${parsed.amount.toFixed(2)} - ${parsed.title}`,
        transaction: {
          id: transaction.id,
          amount: parsed.amount,
          title: parsed.title,
          category: parsed.category
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[IFTTT] Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
