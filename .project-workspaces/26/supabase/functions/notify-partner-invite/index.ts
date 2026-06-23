import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowlist of trusted domains for signupUrl. Prevents the email being weaponized
// to send branded CoinsBloom invites that link to attacker-controlled domains.
const ALLOWED_URL_HOSTS = [
  "coinsbloom.com",
  "www.coinsbloom.com",
  "coinsbloom.lovable.app",
  "lovable.app",
];

const isAllowedSignupUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    return ALLOWED_URL_HOSTS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
};

const escapeHtml = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[NOTIFY-PARTNER-INVITE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // ── AUTH: require a valid Supabase JWT and admin role ────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Verify admin role via security-definer function
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin", {
      _user_id: userId,
    });
    if (roleError || !isAdmin) {
      logStep("Forbidden: caller is not an admin", { userId });
      return new Response(
        JSON.stringify({ error: "Forbidden: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── INPUT VALIDATION ──────────────────────────────────────────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const body = await req.json();
    const { partnerId, partnerName, contactEmail, contactName, signupUrl } = body ?? {};

    if (typeof contactEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return new Response(JSON.stringify({ error: "Invalid contactEmail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof partnerName !== "string" || partnerName.length === 0 || partnerName.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid partnerName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof signupUrl !== "string" || !isAllowedSignupUrl(signupUrl)) {
      logStep("Rejected signupUrl outside allowlist", { signupUrl });
      return new Response(
        JSON.stringify({ error: "signupUrl must be an https URL on a trusted CoinsBloom domain" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    logStep("Sending invite", { partnerName, contactEmail, by: userId });

    const safePartnerName = escapeHtml(partnerName);
    const safeContactName = escapeHtml(contactName || "there");
    // signupUrl already validated against allowlist; still escape for HTML attribute safety
    const safeSignupUrl = escapeHtml(signupUrl);

    const resend = new Resend(resendKey);

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Welcome to CoinsBloom Partner Program!</h2>

        <p>Hi ${safeContactName},</p>

        <p>Great news! <strong>${safePartnerName}</strong> has been approved to join CoinsBloom as a B2B partner.</p>

        <p>As a partner, you'll get:</p>
        <ul>
          <li>Your own branded CoinsBloom portal</li>
          <li>Team member management</li>
          <li>Custom events and content for your users</li>
          <li>Analytics and engagement tracking</li>
          <li>Priority support</li>
        </ul>

        <p style="margin-top: 24px;">
          <a href="${safeSignupUrl}"
             style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Complete Your Partner Setup
          </a>
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you have any questions, just reply to this email and our team will help you get started.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
          This email was sent because your business was referred to join CoinsBloom's partner program.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "CoinsBloom Partners <partners@coinsbloom.com>",
      to: contactEmail,
      subject: `${partnerName} is approved! Complete your CoinsBloom partner setup`,
      html: emailContent,
    });

    logStep("Email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
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
