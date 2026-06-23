import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-AUTOPAY] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { action, payment_method_id, display_name, set_as_default } = await req.json();
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    if (action === "create_setup_intent") {
      // Get or create Stripe customer
      let customerId: string;
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
        logStep("Customer created", { customerId });
      }

      // Create SetupIntent for collecting card details
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session", // For future payments
      });

      logStep("SetupIntent created", { setupIntentId: setupIntent.id });

      return new Response(JSON.stringify({
        client_secret: setupIntent.client_secret,
        customer_id: customerId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_payment_method") {
      if (!payment_method_id) throw new Error("payment_method_id is required");

      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
      logStep("Payment method retrieved", { 
        brand: paymentMethod.card?.brand, 
        last4: paymentMethod.card?.last4 
      });

      // Get or create customer ID
      let customerId: string;
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          metadata: { user_id: user.id }
        });
        customerId = customer.id;
      }

      // Attach payment method to customer if not already
      try {
        await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });
      } catch (e) {
        // Might already be attached
        logStep("Payment method attach note", { message: (e as Error).message });
      }

      // If set as default, update other methods
      if (set_as_default) {
        await supabaseClient
          .from("user_autopay_methods")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      // Save to database
      const { data: savedMethod, error: saveError } = await supabaseClient
        .from("user_autopay_methods")
        .insert({
          user_id: user.id,
          method_type: "stripe_card",
          stripe_payment_method_id: payment_method_id,
          stripe_customer_id: customerId,
          display_name: display_name || `${paymentMethod.card?.brand} ****${paymentMethod.card?.last4}`,
          last_four: paymentMethod.card?.last4,
          brand: paymentMethod.card?.brand,
          is_default: set_as_default || false,
          is_verified: true,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      logStep("Payment method saved", { methodId: savedMethod.id });

      return new Response(JSON.stringify({
        success: true,
        payment_method: savedMethod,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_methods") {
      const { data: methods, error } = await supabaseClient
        .from("user_autopay_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ methods }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_method") {
      const { method_id } = await req.json();
      if (!method_id) throw new Error("method_id is required");

      // Get the method to detach from Stripe
      const { data: method } = await supabaseClient
        .from("user_autopay_methods")
        .select("*")
        .eq("id", method_id)
        .eq("user_id", user.id)
        .single();

      if (method?.stripe_payment_method_id) {
        try {
          await stripe.paymentMethods.detach(method.stripe_payment_method_id);
        } catch (e) {
          logStep("Stripe detach note", { message: (e as Error).message });
        }
      }

      const { error } = await supabaseClient
        .from("user_autopay_methods")
        .delete()
        .eq("id", method_id)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_default") {
      const { method_id } = await req.json();
      if (!method_id) throw new Error("method_id is required");

      // Unset all defaults
      await supabaseClient
        .from("user_autopay_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabaseClient
        .from("user_autopay_methods")
        .update({ is_default: true })
        .eq("id", method_id)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
