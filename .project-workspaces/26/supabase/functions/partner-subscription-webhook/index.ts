import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PARTNER-SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No stripe-signature header");
    }
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: String(err) });
      throw new Error(`Webhook signature verification failed: ${err}`);
    }
    
    logStep("Webhook signature verified");
    
    logStep("Event type", { type: event.type });
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    switch (event.type) {
      case "invoice.paid": {
        await handleInvoicePaid(event.data.object, supabase, stripe);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionCancelled(event.data.object, supabase);
        break;
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      }
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object, supabase);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleCheckoutCompleted(session: any, supabase: any) {
  logStep("Processing checkout.session.completed", { sessionId: session.id });
  
  const metadata = session.metadata || {};
  const referralId = metadata.referral_id;
  const partnerId = metadata.partner_id;
  const subscriptionId = session.subscription;
  
  if (!referralId || !subscriptionId) {
    logStep("No referral_id or subscription in session metadata", metadata);
    return;
  }
  
  // Link the subscription to the referral
  const { error } = await supabase
    .from("b2b_partner_referrals")
    .update({
      stripe_subscription_id: subscriptionId,
      partner_id: partnerId,
      status: "converted",
      converted_at: new Date().toISOString(),
      commission_start_date: new Date().toISOString().split('T')[0],
    })
    .eq("id", referralId);
  
  if (error) {
    logStep("Error linking subscription to referral", { error: error.message });
  } else {
    logStep("Successfully linked subscription to referral", { referralId, subscriptionId });
  }
}

async function handleInvoicePaid(invoice: any, supabase: any, stripe: any) {
  logStep("Processing invoice.paid", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
  
  if (!invoice.subscription) {
    logStep("Invoice not tied to a subscription, skipping");
    return;
  }
  
  // Find the referral linked to this subscription
  const { data: referral, error: referralError } = await supabase
    .from("b2b_partner_referrals")
    .select("*, professionals(user_id, stripe_connect_account_id, payout_method)")
    .eq("stripe_subscription_id", invoice.subscription)
    .single();
  
  if (referralError || !referral) {
    logStep("No referral found for subscription", { subscriptionId: invoice.subscription });
    return;
  }
  
  logStep("Found referral for subscription", { referralId: referral.id, businessName: referral.referred_business_name });
  
  // Check if we've already processed this invoice
  const { data: existingPayment } = await supabase
    .from("referral_commission_payments")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .single();
  
  if (existingPayment) {
    logStep("Invoice already processed", { invoiceId: invoice.id });
    return;
  }
  
  // Check if we're still within the 12-month commission period
  const monthsPaid = referral.commission_months_paid || 0;
  const monthsTotal = referral.commission_months_total || 12;
  
  if (monthsPaid >= monthsTotal) {
    logStep("Commission period complete", { monthsPaid, monthsTotal });
    return;
  }
  
  // Calculate commission
  const invoiceAmount = invoice.amount_paid / 100; // Convert from cents
  const commissionPercent = referral.commission_percent || 10;
  const commissionAmount = invoiceAmount * (commissionPercent / 100);
  
  logStep("Calculating commission", { invoiceAmount, commissionPercent, commissionAmount });
  
  // Determine payout method
  let payoutMethod = "manual";
  let stripeConnectAccountId = null;
  
  if (referral.referrer_type === "professional" && referral.professionals) {
    payoutMethod = referral.professionals.payout_method || "manual";
    stripeConnectAccountId = referral.professionals.stripe_connect_account_id;
  } else if (referral.referrer_type === "user") {
    // Check user's payout preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, payout_method")
      .eq("id", referral.referrer_user_id)
      .single();
    
    if (profile) {
      payoutMethod = profile.payout_method || "manual";
      stripeConnectAccountId = profile.stripe_connect_account_id;
    }
  }
  
  // Create commission payment record
  const newMonthNumber = monthsPaid + 1;
  const { data: commissionPayment, error: insertError } = await supabase
    .from("referral_commission_payments")
    .insert({
      referral_id: referral.id,
      partner_id: referral.partner_id,
      month_number: newMonthNumber,
      commission_amount: commissionAmount,
      partner_payment_amount: invoiceAmount,
      stripe_invoice_id: invoice.id,
      status: payoutMethod === "stripe_connect" && stripeConnectAccountId ? "pending" : "pending",
      payout_method: payoutMethod,
    })
    .select()
    .single();
  
  if (insertError) {
    logStep("Error creating commission payment", { error: insertError.message });
    return;
  }
  
  logStep("Created commission payment", { paymentId: commissionPayment.id, monthNumber: newMonthNumber });
  
  // Update referral totals
  const { error: updateError } = await supabase
    .from("b2b_partner_referrals")
    .update({
      commission_months_paid: newMonthNumber,
      total_commission_paid: (referral.total_commission_paid || 0) + commissionAmount,
      last_commission_date: new Date().toISOString().split('T')[0],
      monthly_revenue: invoiceAmount,
    })
    .eq("id", referral.id);
  
  if (updateError) {
    logStep("Error updating referral totals", { error: updateError.message });
  }
  
  // If Stripe Connect is set up, attempt auto-payout
  if (payoutMethod === "stripe_connect" && stripeConnectAccountId) {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(commissionAmount * 100), // Convert to cents
        currency: invoice.currency || "usd",
        destination: stripeConnectAccountId,
        transfer_group: `referral_${referral.id}`,
        metadata: {
          referral_id: referral.id,
          commission_payment_id: commissionPayment.id,
          month_number: newMonthNumber,
        },
      });
      
      // Update commission payment with transfer info
      await supabase
        .from("referral_commission_payments")
        .update({
          stripe_transfer_id: transfer.id,
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", commissionPayment.id);
      
      logStep("Stripe Connect transfer successful", { transferId: transfer.id });
    } catch (transferError) {
      logStep("Stripe Connect transfer failed", { error: String(transferError) });
      // Leave as pending for manual payout
    }
  }
}

async function handleSubscriptionCancelled(subscription: any, supabase: any) {
  logStep("Processing subscription.deleted", { subscriptionId: subscription.id });
  
  // Find the referral linked to this subscription
  const { data: referral, error } = await supabase
    .from("b2b_partner_referrals")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .single();
  
  if (error || !referral) {
    logStep("No referral found for cancelled subscription");
    return;
  }
  
  // Honor remaining period - don't change commission tracking
  // Just update the referral status
  const cancellationDate = new Date();
  const commissionEndDate = new Date(referral.commission_start_date);
  commissionEndDate.setMonth(commissionEndDate.getMonth() + (referral.commission_months_total || 12));
  
  // If we're still within commission period, keep tracking
  // The monthly invoices will stop coming, so no new commissions will be created
  logStep("Subscription cancelled", {
    referralId: referral.id,
    monthsPaid: referral.commission_months_paid,
    monthsTotal: referral.commission_months_total,
    cancellationDate: cancellationDate.toISOString(),
  });
  
  // Update referral to reflect cancellation but honor existing commission period
  await supabase
    .from("b2b_partner_referrals")
    .update({
      admin_notes: `${referral.admin_notes || ''}\n[${new Date().toISOString()}] Subscription cancelled. Honoring ${referral.commission_months_paid}/${referral.commission_months_total} months paid.`.trim(),
    })
    .eq("id", referral.id);
}

async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  logStep("Processing subscription.updated", { subscriptionId: subscription.id, status: subscription.status });
  
  // Find the referral linked to this subscription
  const { data: referral, error } = await supabase
    .from("b2b_partner_referrals")
    .select("*")
    .eq("stripe_subscription_id", subscription.id)
    .single();
  
  if (error || !referral) {
    logStep("No referral found for updated subscription");
    return;
  }
  
  // Update monthly revenue if subscription amount changed
  if (subscription.items?.data?.[0]?.price?.unit_amount) {
    const baseAmount = subscription.items.data[0].price.unit_amount / 100;
    const quantity = subscription.items.data[0].quantity || 1;
    const totalMonthly = baseAmount * quantity;
    
    // Check for seat pricing
    if (subscription.items.data.length > 1) {
      const seatItem = subscription.items.data.find((item: any) => 
        item.price.id !== subscription.items.data[0].price.id
      );
      if (seatItem) {
        const seatAmount = (seatItem.price.unit_amount / 100) * (seatItem.quantity || 0);
        await supabase
          .from("b2b_partner_referrals")
          .update({
            monthly_revenue: baseAmount + seatAmount,
            estimated_seats: seatItem.quantity,
          })
          .eq("id", referral.id);
      }
    }
  }
}
