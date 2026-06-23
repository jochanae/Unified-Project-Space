import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreditAlertRequest {
  alertType: "significant_change" | "milestone" | "utilization_warning";
  currentScore?: number;
  previousScore?: number;
  milestone?: number;
  utilizationPercent?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Authenticated user:", user.id);

    // Use the authenticated user's email instead of from request body
    const email = user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email associated with this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { alertType, currentScore, previousScore, milestone, utilizationPercent }: CreditAlertRequest = await req.json();

    console.log(`Processing credit alert for user ${user.id}, type: ${alertType}`);

    let subject = "";
    let htmlContent = "";

    switch (alertType) {
      case "significant_change":
        const change = (currentScore || 0) - (previousScore || 0);
        const direction = change > 0 ? "increased" : "decreased";
        subject = `🔔 Credit Score Alert: Your score has ${direction}!`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Credit Score Update</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #374151;">Your credit score has ${direction} by <strong style="color: ${change > 0 ? '#10b981' : '#ef4444'};">${Math.abs(change)} points</strong>!</p>
              <div style="display: flex; justify-content: space-around; margin: 30px 0; text-align: center;">
                <div>
                  <p style="color: #6b7280; margin: 0;">Previous Score</p>
                  <p style="font-size: 36px; font-weight: bold; color: #374151; margin: 5px 0;">${previousScore}</p>
                </div>
                <div style="font-size: 24px; color: #9ca3af; align-self: center;">→</div>
                <div>
                  <p style="color: #6b7280; margin: 0;">Current Score</p>
                  <p style="font-size: 36px; font-weight: bold; color: ${change > 0 ? '#10b981' : '#ef4444'}; margin: 5px 0;">${currentScore}</p>
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Log in to CoinsBloom to view your full credit report and tips for improvement.</p>
            </div>
          </div>
        `;
        break;

      case "milestone":
        subject = `🎉 Congratulations! You've reached a credit score milestone!`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; border-radius: 12px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">🎉 Milestone Achieved!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="font-size: 18px; color: #374151;">Amazing work! You've reached a credit score of:</p>
              <p style="font-size: 72px; font-weight: bold; color: #8b5cf6; margin: 20px 0;">${milestone}</p>
              <p style="color: #6b7280;">Keep up the great financial habits!</p>
            </div>
          </div>
        `;
        break;

      case "utilization_warning":
        subject = `⚠️ Credit Utilization Alert: ${utilizationPercent}% usage detected`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">Credit Utilization Warning</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="font-size: 18px; color: #374151;">Your credit utilization is at <strong style="color: #f59e0b;">${utilizationPercent}%</strong></p>
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0;"><strong>Tip:</strong> Keeping your utilization below 30% can help improve your credit score.</p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Consider paying down balances to lower your utilization rate.</p>
            </div>
          </div>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "CoinsBloom <noreply@coinsbloom.com>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in credit-score-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
