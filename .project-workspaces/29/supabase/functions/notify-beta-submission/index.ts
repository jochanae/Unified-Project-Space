import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BetaNotification {
  tester_name: string;
  tester_email: string;
  overall_rating: number | null;
  device_info: string | null;
  general_feedback: string | null;
  suggestions: string | null;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);
    const payload: BetaNotification = await req.json();

    const {
      tester_name,
      tester_email,
      overall_rating,
      device_info,
      general_feedback,
      suggestions,
      total_steps,
      passed_steps,
      failed_steps,
    } = payload;

    const passRate = total_steps > 0 ? Math.round((passed_steps / total_steps) * 100) : 0;
    const ratingDisplay = overall_rating ? `${"★".repeat(overall_rating)}${"☆".repeat(5 - overall_rating)}` : "Not rated";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px; font-size: 22px;">🧪 New Beta Test Submission</h1>
          <p style="margin: 0; opacity: 0.8; font-size: 14px;">A tester has completed the beta checklist</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #333;">Tester Info</h3>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Name:</strong> ${tester_name}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${tester_email}">${tester_email}</a></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Device:</strong> ${device_info || "Not provided"}</p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>Rating:</strong> ${ratingDisplay}</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 16px; color: #333;">Results Summary</h3>
          <div style="display: flex; gap: 16px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: ${passRate >= 80 ? '#22c55e' : passRate >= 50 ? '#f59e0b' : '#ef4444'};">${passRate}%</div>
              <div style="font-size: 12px; color: #666;">Pass Rate</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #22c55e;">${passed_steps}</div>
              <div style="font-size: 12px; color: #666;">Passed</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${failed_steps}</div>
              <div style="font-size: 12px; color: #666;">Failed</div>
            </div>
          </div>
        </div>

        ${general_feedback ? `
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
          <h4 style="margin: 0 0 6px; font-size: 14px; color: #1e40af;">General Feedback</h4>
          <p style="margin: 0; font-size: 14px; color: #333;">${general_feedback}</p>
        </div>` : ""}

        ${suggestions ? `
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
          <h4 style="margin: 0 0 6px; font-size: 14px; color: #166534;">Suggestions</h4>
          <p style="margin: 0; font-size: 14px; color: #333;">${suggestions}</p>
        </div>` : ""}

        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 24px;">
          IntoIQ Beta Testing System
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "IntoIQ <onboarding@resend.dev>",
      to: ["jochanae@gmail.com"],
      subject: `🧪 Beta Test: ${tester_name} — ${passRate}% pass rate (${overall_rating || 0}/5 ★)`,
      html,
    });

    console.log("Beta notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending beta notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
