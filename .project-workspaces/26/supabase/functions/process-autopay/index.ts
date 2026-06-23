import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { calculateFee, generateFeeQuote } from "../_shared/autopay-fees.ts";
import { checkUserPremium } from "../_shared/autopay-premium.ts";
import { processPayment, type PaymentMethod } from "../_shared/autopay-payments.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-AUTOPAY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ==================== PROCESS SCHEDULED AUTOPAYS (CRON) ====================
    if (action === "process_scheduled") {
      return await handleProcessScheduled(req, supabaseClient, stripeKey);
    }

    // ==================== SCHEDULE AUTOPAY ====================
    if (action === "schedule_autopay") {
      return await handleScheduleAutopay(req, body, supabaseClient);
    }

    // ==================== CANCEL AUTOPAY ====================
    if (action === "cancel_autopay") {
      return await handleCancelAutopay(req, body, supabaseClient);
    }

    // ==================== GET FEE QUOTE ====================
    if (action === "get_fee_quote") {
      return await handleGetFeeQuote(req, body, supabaseClient);
    }

    throw new Error("Invalid action");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ==================== HANDLER FUNCTIONS ====================

async function handleProcessScheduled(
  req: Request, 
  supabaseClient: any, 
  stripeKey: string
): Promise<Response> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const requestCronSecret = req.headers.get("x-cron-secret");
  if (requestCronSecret !== cronSecret) {
    throw new Error("Unauthorized - invalid cron secret");
  }

  logStep("Processing scheduled autopays");
  
  const today = new Date().toISOString().split('T')[0];
  
  // Get all pending autopays for today
  const { data: pendingAutopays, error: fetchError } = await supabaseClient
    .from("scheduled_autopay")
    .select(`
      *,
      bill:bills(*),
      payment_method:user_autopay_methods(*)
    `)
    .eq("status", "pending")
    .lte("scheduled_date", today);

  if (fetchError) throw fetchError;
  if (!pendingAutopays || pendingAutopays.length === 0) {
    logStep("No pending autopays to process");
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  logStep("Found pending autopays", { count: pendingAutopays.length });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  let processed = 0;
  let failed = 0;

  for (const autopay of pendingAutopays) {
    try {
      // Mark as processing
      await supabaseClient
        .from("scheduled_autopay")
        .update({ status: "processing" })
        .eq("id", autopay.id);

      const paymentMethod = autopay.payment_method as PaymentMethod;
      if (!paymentMethod) {
        throw new Error("No valid payment method");
      }

      // Check premium status (uses cache)
      const { isPremium } = await checkUserPremium(supabaseClient, autopay.user_id);
      
      // Calculate fee based on method type and tier
      const { fee, total } = calculateFee(autopay.amount, paymentMethod.method_type, isPremium);
      logStep("Fee calculated", { 
        billAmount: autopay.amount, 
        fee, 
        total, 
        methodType: paymentMethod.method_type,
        isPremium 
      });

      const amountInCents = Math.round(total * 100);
      const metadata = {
        bill_id: autopay.bill_id,
        user_id: autopay.user_id,
        autopay_id: autopay.id,
        bill_amount: autopay.amount.toString(),
        fee: fee.toString(),
        method_type: paymentMethod.method_type,
      };

      // Process payment using the appropriate method
      const result = await processPayment(stripe, paymentMethod, amountInCents, metadata);

      if (result.success) {
        // Update scheduled autopay as completed
        await supabaseClient
          .from("scheduled_autopay")
          .update({
            status: "completed",
            stripe_payment_intent_id: result.paymentIntentId,
            processed_at: new Date().toISOString(),
          })
          .eq("id", autopay.id);

        // Record in history
        await supabaseClient
          .from("autopay_history")
          .insert({
            user_id: autopay.user_id,
            bill_id: autopay.bill_id,
            payment_method_id: autopay.payment_method_id,
            amount: autopay.amount,
            status: "success",
            stripe_payment_intent_id: result.paymentIntentId,
            stripe_charge_id: result.chargeId,
          });

        // Update bill as paid
        await supabaseClient
          .from("bills")
          .update({
            status: "paid",
            last_paid_date: new Date().toISOString().split('T')[0],
          })
          .eq("id", autopay.bill_id);

        // Record bill payment
        await supabaseClient
          .from("bill_payments")
          .insert({
            user_id: autopay.user_id,
            bill_id: autopay.bill_id,
            amount: autopay.amount,
            paid_date: new Date().toISOString().split('T')[0],
            payment_method: `Autopay - ${paymentMethod.display_name}`,
          });

        processed++;
      } else {
        throw new Error(result.error || "Payment failed");
      }

    } catch (paymentError) {
      const errorMsg = paymentError instanceof Error ? paymentError.message : String(paymentError);
      logStep("Payment failed", { autopayId: autopay.id, error: errorMsg });

      // Update as failed
      await supabaseClient
        .from("scheduled_autopay")
        .update({
          status: "failed",
          error_message: errorMsg,
          retry_count: (autopay.retry_count || 0) + 1,
        })
        .eq("id", autopay.id);

      // Record in history
      await supabaseClient
        .from("autopay_history")
        .insert({
          user_id: autopay.user_id,
          bill_id: autopay.bill_id,
          payment_method_id: autopay.payment_method_id,
          amount: autopay.amount,
          status: "failed",
          error_message: errorMsg,
        });

      failed++;
    }
  }

  logStep("Processing complete", { processed, failed });

  return new Response(JSON.stringify({ processed, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleScheduleAutopay(
  req: Request, 
  body: any, 
  supabaseClient: any
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Unauthorized");
  
  const user = userData.user;
  const { bill_id, payment_method_id, amount } = body;

  if (!bill_id || !payment_method_id || !amount) {
    throw new Error("bill_id, payment_method_id, and amount are required");
  }

  // Verify bill belongs to user
  const { data: bill, error: billError } = await supabaseClient
    .from("bills")
    .select("*")
    .eq("id", bill_id)
    .eq("user_id", user.id)
    .single();

  if (billError || !bill) throw new Error("Bill not found");

  // Verify payment method belongs to user
  const { data: paymentMethod, error: pmError } = await supabaseClient
    .from("user_autopay_methods")
    .select("*")
    .eq("id", payment_method_id)
    .eq("user_id", user.id)
    .single();

  if (pmError || !paymentMethod) throw new Error("Payment method not found");

  // Cancel any existing pending autopay for this bill
  await supabaseClient
    .from("scheduled_autopay")
    .update({ status: "cancelled" })
    .eq("bill_id", bill_id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  // Create new scheduled autopay
  const { data: scheduled, error: scheduleError } = await supabaseClient
    .from("scheduled_autopay")
    .insert({
      user_id: user.id,
      bill_id,
      payment_method_id,
      amount,
      scheduled_date: bill.due_date,
      status: "pending",
    })
    .select()
    .single();

  if (scheduleError) throw scheduleError;

  // Update bill to mark as autopay enabled
  await supabaseClient
    .from("bills")
    .update({ 
      is_autopay: true,
      scheduled_payment_date: bill.due_date,
    })
    .eq("id", bill_id);

  logStep("Autopay scheduled", { billId: bill_id, scheduledId: scheduled.id });

  return new Response(JSON.stringify({ success: true, scheduled }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCancelAutopay(
  req: Request, 
  body: any, 
  supabaseClient: any
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Unauthorized");
  
  const user = userData.user;
  const { bill_id } = body;

  if (!bill_id) throw new Error("bill_id is required");

  // Cancel pending autopay
  await supabaseClient
    .from("scheduled_autopay")
    .update({ status: "cancelled" })
    .eq("bill_id", bill_id)
    .eq("user_id", user.id)
    .eq("status", "pending");

  // Update bill
  await supabaseClient
    .from("bills")
    .update({ 
      is_autopay: false,
      scheduled_payment_date: null,
    })
    .eq("id", bill_id)
    .eq("user_id", user.id);

  logStep("Autopay cancelled", { billId: bill_id });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleGetFeeQuote(
  req: Request, 
  body: any, 
  supabaseClient: any
): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error("Unauthorized");
  
  const user = userData.user;
  const { amount, payment_method_id } = body;

  if (!amount) {
    throw new Error("amount is required");
  }

  // Check premium status (uses cache)
  const { isPremium } = await checkUserPremium(supabaseClient, user.id);

  // If payment_method_id provided, get the method type
  let methodType: 'stripe_card' | 'plaid_ach' = 'stripe_card'; // default
  if (payment_method_id) {
    const { data: paymentMethod } = await supabaseClient
      .from("user_autopay_methods")
      .select("method_type")
      .eq("id", payment_method_id)
      .eq("user_id", user.id)
      .single();
    
    if (paymentMethod) {
      methodType = paymentMethod.method_type;
    }
  }

  // Generate complete fee quote
  const quote = generateFeeQuote(amount, methodType, isPremium);

  logStep("Fee quote generated", { 
    amount, 
    isPremium, 
    cardFee: quote.card.fee, 
    achFee: quote.ach.fee 
  });

  return new Response(JSON.stringify(quote), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
