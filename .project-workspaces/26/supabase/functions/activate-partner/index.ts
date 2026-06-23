import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-PARTNER] ${step}${detailsStr}`);
};

// Helper to link referral to subscription for commission tracking
async function linkReferralToSubscription(
  supabaseClient: any,
  referralId: string,
  partnerId: string,
  stripeSubscriptionId: string
) {
  logStep("Linking referral to subscription", { referralId, partnerId, stripeSubscriptionId });
  
  const { error } = await supabaseClient
    .from("b2b_partner_referrals")
    .update({
      stripe_subscription_id: stripeSubscriptionId,
      partner_id: partnerId,
      status: "converted",
      converted_at: new Date().toISOString(),
      commission_start_date: new Date().toISOString().split('T')[0],
    })
    .eq("id", referralId);
  
  if (error) {
    logStep("Error linking referral", { error: error.message });
  } else {
    logStep("Referral linked successfully");
  }
}

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get request body
    const { partnerName, slug, seats, referralId, stripeSubscriptionId } = await req.json();
    if (!partnerName || !slug || !seats) {
      throw new Error("Missing required fields");
    }
    logStep("Activating partner", { partnerName, slug, seats, referralId });

    // Check if partner already exists
    const { data: existingPartner } = await supabaseClient
      .from("partners")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existingPartner) {
      // Update existing partner
      const { error: updateError } = await supabaseClient
        .from("partners")
        .update({
          subscription_status: "active",
          seats_purchased: parseInt(seats),
          is_active: true,
          stripe_subscription_id: stripeSubscriptionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPartner.id);

      if (updateError) throw updateError;
      logStep("Partner updated", { partnerId: existingPartner.id });

      // Link referral to subscription if provided
      if (referralId && stripeSubscriptionId) {
        await linkReferralToSubscription(supabaseClient, referralId, existingPartner.id, stripeSubscriptionId);
      }

      return new Response(JSON.stringify({ success: true, partnerId: existingPartner.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create new partner
    const { data: newPartner, error: insertError } = await supabaseClient
      .from("partners")
      .insert({
        name: partnerName,
        slug: slug,
        owner_user_id: user.id,
        contact_email: user.email,
        subscription_status: "active",
        seats_purchased: parseInt(seats),
        is_active: true,
        stripe_subscription_id: stripeSubscriptionId || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    logStep("Partner created", { partnerId: newPartner.id });

    // Link referral to subscription if provided
    if (referralId && stripeSubscriptionId) {
      await linkReferralToSubscription(supabaseClient, referralId, newPartner.id, stripeSubscriptionId);
    }

    // Add owner as first member
    await supabaseClient
      .from("partner_members")
      .insert({
        partner_id: newPartner.id,
        user_id: user.id,
        role: "owner",
      });

    return new Response(JSON.stringify({ success: true, partnerId: newPartner.id }), {
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
