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
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the access token and decode the JWT payload to get the user id.
    // We intentionally avoid supabase.auth.getUser() here because it can fail in stateless
    // function contexts; the platform already verifies the JWT when verify_jwt=true.
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decodeBase64Url = (input: string) => {
      const padded = input.replace(/-/g, "+").replace(/_/g, "/") +
        "=".repeat((4 - (input.length % 4)) % 4);
      return atob(padded);
    };

    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const payload = JSON.parse(decodeBase64Url(parts[1]));
      userId = payload?.sub ?? null;
      userEmail = payload?.email ?? null;
    } catch (e) {
      console.log("JWT decode error:", e);
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(userId, RATE_LIMITS.VOICE_COMMAND);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limited user ${userId} for voice-command`);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    console.log("Voice command from user:", userId, userEmail ? `(${userEmail})` : "");

    // Keep compatibility with the rest of the function
    const user = { id: userId } as { id: string };
    
    const { command, intent, parameters } = await req.json();
    console.log("Processing command:", command, "Intent:", intent, "Params:", parameters);

    // Handle different intents
    switch (intent) {
      case "navigate": {
        // Navigation is handled client-side, just acknowledge
        return new Response(JSON.stringify({
          success: true,
          action: "navigate",
          target: parameters.target,
          response: parameters.response || `Navigating to ${parameters.target}`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      case "transaction": {
        // Check for Bloom Burst
        let bloomBurstId = null;
        if (parameters.isBloomBurstTransaction) {
          const { data: activeBursts } = await supabase
            .from("bloom_bursts")
            .select("id, name")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();
          
          if (activeBursts) {
            bloomBurstId = activeBursts.id;
            console.log("Found active Bloom Burst:", activeBursts.name);
          }
        }

        // Insert transaction
        const { data: transaction, error: txError } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            title: parameters.description || "Voice Transaction",
            amount: parameters.amount,
            type: parameters.type || "expense",
            category: parameters.category || "Other",
            merchant: parameters.merchant,
            transaction_date: parameters.date || new Date().toISOString().split('T')[0],
            is_recurring: parameters.recurring || false,
            bloom_burst_id: bloomBurstId,
            notes: `Added via voice: "${command}"`,
          })
          .select()
          .single();

        if (txError) {
          console.error("Transaction insert error:", txError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: txError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update Bloom Burst spent amount if applicable
        if (bloomBurstId && parameters.type === "expense") {
          // Get current spent amount and update
          const { data: burst } = await supabase
            .from("bloom_bursts")
            .select("spent_amount")
            .eq("id", bloomBurstId)
            .single();
          
          if (burst) {
            await supabase
              .from("bloom_bursts")
              .update({ spent_amount: (burst.spent_amount || 0) + parameters.amount })
              .eq("id", bloomBurstId);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          response: bloomBurstId
            ? `Added $${parameters.amount} ${parameters.type} to Bloom Burst: ${parameters.description}`
            : `Added $${parameters.amount} ${parameters.type}: ${parameters.description}`,
          transaction,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "budget": {
        const { data: budget, error: budgetError } = await supabase
          .from("budgets")
          .insert({
            user_id: user.id,
            name: parameters.category || "Voice Budget",
            amount: parameters.amount,
            category: parameters.category?.toLowerCase() || "other",
            period: "monthly",
            spent: 0,
            is_active: true,
          })
          .select()
          .single();

        if (budgetError) {
          console.error("Budget insert error:", budgetError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: budgetError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          response: `Created $${parameters.amount} budget for ${parameters.category}`,
          budget,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "bill": {
        // Find and mark bill as paid
        const { data: bill } = await supabase
          .from("bills")
          .select("*")
          .eq("user_id", user.id)
          .ilike("name", `%${parameters.bill}%`)
          .single();

        if (bill) {
          await supabase
            .from("bill_payments")
            .insert({
              user_id: user.id,
              bill_id: bill.id,
              amount: bill.amount,
              paid_date: new Date().toISOString().split('T')[0],
              payment_method: "voice_command",
            });

          await supabase
            .from("bills")
            .update({ 
              status: "paid",
              last_paid_date: new Date().toISOString().split('T')[0],
            })
            .eq("id", bill.id);

          return new Response(JSON.stringify({
            success: true,
            response: `Marked ${bill.name} bill as paid ($${bill.amount})`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: false,
          response: `Could not find a bill matching "${parameters.bill}"`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "savings": {
        if (parameters.amount && parameters.goal) {
          // Add to existing goal
          const { data: goal } = await supabase
            .from("goals")
            .select("*")
            .eq("user_id", user.id)
            .ilike("title", `%${parameters.goal}%`)
            .single();

          if (goal) {
            const newAmount = goal.current_amount + parameters.amount;
            await supabase
              .from("goals")
              .update({ current_amount: newAmount })
              .eq("id", goal.id);

            await supabase
              .from("goal_contributions")
              .insert({
                goal_id: goal.id,
                user_id: user.id,
                amount: parameters.amount,
                notes: `Added via voice command`,
              });

            return new Response(JSON.stringify({
              success: true,
              response: `Added $${parameters.amount} to ${goal.title}. New total: $${newAmount}`,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Create new goal
        const { data: newGoal, error: goalError } = await supabase
          .from("goals")
          .insert({
            user_id: user.id,
            title: parameters.goal || "Voice Savings Goal",
            target_amount: parameters.amount || 1000,
            current_amount: 0,
            goal_type: "personal",
          })
          .select()
          .single();

        if (goalError) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: goalError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          response: `Created savings goal: ${newGoal.title}`,
          goal: newGoal,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "query": {
        // Fetch relevant data based on query
        const query = parameters.query?.toLowerCase() || "";
        
        if (query.includes("balance") || query.includes("net worth")) {
          const { data: accounts } = await supabase
            .from("accounts")
            .select("balance, account_type")
            .eq("user_id", user.id);
          
          const total = accounts?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;
          
          return new Response(JSON.stringify({
            success: true,
            response: `Your total balance is $${total.toLocaleString()}`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (query.includes("spending") || query.includes("spent")) {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          
          const { data: transactions } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", user.id)
            .eq("type", "expense")
            .gte("transaction_date", startOfMonth.toISOString().split('T')[0]);
          
          const total = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
          
          return new Response(JSON.stringify({
            success: true,
            response: `You've spent $${total.toLocaleString()} this month`,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (query.includes("bills")) {
          const { data: bills } = await supabase
            .from("bills")
            .select("name, amount, due_date")
            .eq("user_id", user.id)
            .eq("status", "pending")
            .order("due_date")
            .limit(5);
          
          if (bills && bills.length > 0) {
            const billList = bills.map(b => `${b.name}: $${b.amount}`).join(", ");
            return new Response(JSON.stringify({
              success: true,
              response: `Upcoming bills: ${billList}`,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          return new Response(JSON.stringify({
            success: true,
            response: "You have no upcoming bills",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          response: "I can help you check your balance, spending, or bills. What would you like to know?",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          response: "I didn't understand that command. Try saying something like 'Add $50 expense for groceries'.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Voice command error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
