import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "jochanae@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message, userAgent } = await req.json();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">
          🚨 New Sign-In Issue Report
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f3f4f6; border: 1px solid #e5e7eb;">Name</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${name || "Anonymous"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f3f4f6; border: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${email || "Not provided"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; background: #f3f4f6; border: 1px solid #e5e7eb;">User Agent</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${userAgent || "Unknown"}</td>
          </tr>
        </table>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin: 0 0 8px 0; color: #92400e;">Issue Description</h3>
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
          This notification was sent from CoinsBloom Sign-In Feedback system.
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CoinsBloom Alerts <noreply@coinsbloom.com>",
        to: [ADMIN_EMAIL],
        subject: `🚨 Sign-In Issue: ${name || "Anonymous User"}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend error: ${res.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
