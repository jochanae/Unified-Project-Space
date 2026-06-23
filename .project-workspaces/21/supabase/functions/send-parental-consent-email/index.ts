import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping parental consent email");
      return new Response(JSON.stringify({ sent: false, reason: "no_api_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { parentEmail, childName, childAge } = await req.json();

    if (!parentEmail || typeof parentEmail !== "string") {
      return new Response(JSON.stringify({ error: "parentEmail is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://mycompani.lovable.app";
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@mycompani.com";

    const displayName = childName || "Your child";
    const displayAge = childAge ? ` (age ${childAge})` : "";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Compani <noreply@mycompani.com>",
        to: [parentEmail],
        subject: `Parental Consent Required — ${displayName} wants to use Compani`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
            <h2 style="color: #1a1a2e; margin-bottom: 8px;">Parental Consent Request</h2>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              ${displayName}${displayAge} has signed up for <strong>Compani</strong>, an AI companion app.
              Because they are under 13, we need your permission before they can use the platform.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              Compani provides age-appropriate AI companionship with safety guardrails for younger users,
              including content filtering and restricted features.
            </p>
            <h3 style="color: #1a1a2e; margin-top: 24px;">What we collect</h3>
            <ul style="color: #555; font-size: 14px; line-height: 1.8;">
              <li>Preferred name and date of birth</li>
              <li>Conversation messages (used only to personalize the experience)</li>
              <li>No data is sold or shared with third parties</li>
            </ul>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              To grant consent, please reply to this email confirming you are the parent or legal guardian
              and that you approve ${displayName}'s use of Compani.
            </p>
            <p style="color: #555; font-size: 15px; line-height: 1.6;">
              If you did not expect this email or have questions, please contact us at
              <a href="mailto:${adminEmail}" style="color: #6c63ff;">${adminEmail}</a>.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0 16px;" />
            <p style="color: #999; font-size: 12px;">
              This email was sent by Compani. You are receiving it because your email was provided
              as a parent or guardian contact.
              <br /><a href="${siteUrl}/privacy" style="color: #6c63ff;">Privacy Policy</a> ·
              <a href="${siteUrl}/terms" style="color: #6c63ff;">Terms of Service</a>
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
    }

    return new Response(JSON.stringify({ sent: res.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending parental consent email:", error);
    return new Response(JSON.stringify({ error: "Failed to send consent email" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
