import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PARTNER-FROM-REFERRAL] ${step}${detailsStr}`);
};

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

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: adminCheck } = await supabaseClient
      .from("admin_emails")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!adminCheck) {
      throw new Error("Only admins can create partners from referrals");
    }

    logStep("Admin verified", { userId: user.id });

    // Get request body
    const { referralId } = await req.json();
    if (!referralId) throw new Error("Missing referralId");

    // Get the referral
    const { data: referral, error: referralError } = await supabaseClient
      .from("b2b_partner_referrals")
      .select("*")
      .eq("id", referralId)
      .single();

    if (referralError || !referral) {
      throw new Error("Referral not found");
    }

    logStep("Referral found", { 
      businessName: referral.referred_business_name,
      status: referral.status 
    });

    // Generate a slug from business name
    const baseSlug = referral.referred_business_name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);

    // Check if slug exists and make unique if needed
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data: existingPartner } = await supabaseClient
        .from("partners")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      
      if (!existingPartner) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    logStep("Slug generated", { slug });

    // Create the partner (pending - will be activated after payment)
    const { data: newPartner, error: partnerError } = await supabaseClient
      .from("partners")
      .insert({
        name: referral.referred_business_name,
        slug: slug,
        contact_email: referral.referred_contact_email,
        subscription_status: "pending",
        seats_purchased: referral.estimated_seats || 5,
        is_active: false,
        referral_id: referralId,
      })
      .select()
      .single();

    if (partnerError) throw partnerError;

    logStep("Partner created", { partnerId: newPartner.id });

    // Update referral status to converted
    const { error: updateError } = await supabaseClient
      .from("b2b_partner_referrals")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
      })
      .eq("id", referralId);

    if (updateError) {
      logStep("Warning: Failed to update referral status", { error: updateError.message });
    }

    // Send invite email to the partner contact
    if (referral.referred_contact_email) {
      try {
        const signupUrl = `${req.headers.get("origin") || "https://coinsbloom.com"}/partner/signup?invite=${newPartner.id}&slug=${slug}`;
        
        // We'll trigger the email notification
        await supabaseClient.functions.invoke("notify-partner-invite", {
          body: {
            partnerId: newPartner.id,
            partnerName: newPartner.name,
            contactEmail: referral.referred_contact_email,
            contactName: referral.referred_contact_name,
            signupUrl: signupUrl,
          },
        });
        
        logStep("Invite notification sent");
      } catch (emailError) {
        logStep("Warning: Failed to send invite email", { error: String(emailError) });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      partnerId: newPartner.id,
      slug: slug,
      message: "Partner account created. They will receive an email to complete setup."
    }), {
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
