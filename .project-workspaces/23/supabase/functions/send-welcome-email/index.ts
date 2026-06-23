import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, org_id, project_id } = await req.json();

    if (!email || !org_id || !project_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get project name
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", project_id)
      .single();

    const projectName = project?.name || "Our Project";

    // Look up welcome email sequence
    const { data: sequences } = await supabase
      .from("email_sequences")
      .select("subject, body")
      .eq("project_id", project_id)
      .or("trigger_stage.eq.welcome,order_index.eq.0")
      .order("order_index")
      .limit(1);

    let subject = `Welcome to ${projectName} — Your Signal is Live`;
    let body = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header with gold accent -->
        <tr><td style="text-align:center;padding:30px 40px 20px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#f0d78c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:700;letter-spacing:2px;">IntoIQ</div>
        </td></tr>
        <!-- Gold divider -->
        <tr><td style="padding:0 40px;">
          <div style="height:1px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:30px 40px;">
          <h1 style="color:#f5f5f5;font-size:22px;font-weight:600;margin:0 0 16px;line-height:1.3;">Your signal is locked in.</h1>
          <p style="color:#a0a0a0;font-size:15px;line-height:1.7;margin:0 0 20px;">
            Thank you for stepping into <strong style="color:#e0e0e0;">${projectName}</strong>. We've received your information and your funnel intelligence is now active.
          </p>
          <p style="color:#a0a0a0;font-size:15px;line-height:1.7;margin:0 0 24px;">
            What happens next? Our AI strategist MarQ is already analyzing your position. You'll hear from us with insights tailored specifically to your goals.
          </p>
          <p style="color:#a0a0a0;font-size:15px;line-height:1.7;margin:0 0 8px;">
            Stop overthinking. Start executing.
          </p>
        </td></tr>
        <!-- MarQ signature -->
        <tr><td style="padding:0 40px 30px;">
          <div style="border-top:1px solid #1a1a2e;padding-top:20px;">
            <p style="color:#c9a84c;font-size:13px;font-weight:600;margin:0 0 4px;letter-spacing:1px;">MarQ</p>
            <p style="color:#666;font-size:12px;margin:0;font-style:italic;">Intelligence Partner · IntoIQ</p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="color:#444;font-size:11px;margin:0;">Powered by Into Innovations</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    if (sequences && sequences.length > 0) {
      subject = sequences[0].subject || subject;
      // If custom body exists, use it; otherwise keep the premium template
      if (sequences[0].body && sequences[0].body.trim().length > 10) {
        body = sequences[0].body;
      }
    }

    // Send via Resend connector gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `${projectName} <${fromEmail}>`,
        to: [email],
        subject,
        html: body,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend API error:", emailData);
      return new Response(JSON.stringify({ error: "Email send failed", details: emailData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: emailData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
