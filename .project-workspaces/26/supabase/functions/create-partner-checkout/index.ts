import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PARTNER-CHECKOUT] ${step}${detailsStr}`);
};

// B2B Pricing
const B2B_BASE_PRICE_ID = "price_1SfTb1C6CkNu7qeVB7iVbbI3"; // $29/mo base
const B2B_SEAT_PRICE_ID = "price_1SfTdeC6CkNu7qeV2Z1r4or3"; // $7/seat/mo

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get request body
    const { partnerName, seats, slug, referralId } = await req.json();
    if (!partnerName || !seats || !slug) {
      throw new Error("Missing required fields: partnerName, seats, slug");
    }
    logStep("Request parsed", { partnerName, seats, slug, referralId });

    // Check if slug is already taken
    const { data: existingPartner } = await supabaseClient
      .from("partners")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingPartner) {
      throw new Error("This partner slug is already taken");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if user already has a Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Create checkout session with base + seats
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: B2B_BASE_PRICE_ID,
          quantity: 1,
        },
        {
          price: B2B_SEAT_PRICE_ID,
          quantity: seats,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/admin/enterprise?success=true&partner=${encodeURIComponent(partnerName)}&seats=${seats}&slug=${slug}${referralId ? `&referral=${referralId}` : ''}`,
      cancel_url: `${req.headers.get("origin")}/admin/enterprise?canceled=true`,
      metadata: {
        partner_name: partnerName,
        partner_slug: slug,
        seats: seats.toString(),
        owner_user_id: user.id,
        referral_id: referralId || "",
      },
      subscription_data: {
        metadata: {
          partner_name: partnerName,
          partner_slug: slug,
          seats: seats.toString(),
          owner_user_id: user.id,
          referral_id: referralId || "",
        },
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
