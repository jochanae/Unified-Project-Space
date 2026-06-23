import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-B2B-REFERRAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { referralId, businessName, contactName, contactEmail, estimatedSeats, referrerName, referrerType } = await req.json();
    
    if (!referralId || !businessName) {
      throw new Error("Missing required fields: referralId, businessName");
    }

    logStep("Processing referral notification", { referralId, businessName });

    // Get admin emails
    const { data: adminEmails } = await supabaseClient
      .from("admin_emails")
      .select("email");

    if (!adminEmails || adminEmails.length === 0) {
      logStep("No admin emails configured, skipping notification");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const resend = new Resend(resendKey);

    const emailContent = `
      <h2>New B2B Partner Referral</h2>
      <p>A new business has been referred to join as a B2B partner.</p>
      
      <h3>Business Details</h3>
      <ul>
        <li><strong>Business Name:</strong> ${businessName}</li>
        <li><strong>Contact Name:</strong> ${contactName || 'Not provided'}</li>
        <li><strong>Contact Email:</strong> ${contactEmail || 'Not provided'}</li>
        <li><strong>Estimated Seats:</strong> ${estimatedSeats || 'Not specified'}</li>
      </ul>
      
      <h3>Referrer Information</h3>
      <ul>
        <li><strong>Referred By:</strong> ${referrerName || 'Unknown'}</li>
        <li><strong>Referrer Type:</strong> ${referrerType === 'professional' ? 'Financial Professional' : 'User'}</li>
      </ul>
      
      <p style="margin-top: 24px;">
        <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || 'https://coinsbloom.com'}/admin/enterprise" 
           style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Review in Enterprise Portal
        </a>
      </p>
    `;

    // Send to all admin emails
    for (const admin of adminEmails) {
      await resend.emails.send({
        from: "CoinsBloom <noreply@coinsbloom.com>",
        to: admin.email,
        subject: `New B2B Referral: ${businessName}`,
        html: emailContent,
      });
      logStep("Email sent", { to: admin.email });
    }

    return new Response(JSON.stringify({ success: true, emailsSent: adminEmails.length }), {
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
