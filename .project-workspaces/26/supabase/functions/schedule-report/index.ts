import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduleRequest {
  frequency: "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  includeCharts: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    const email = user.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "No email associated with this account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { frequency, dayOfWeek, dayOfMonth, includeCharts }: ScheduleRequest = await req.json();

    console.log("Scheduling report for:", email, frequency);

    // Calculate next send date
    const now = new Date();
    let nextSendAt = new Date();
    
    if (frequency === "weekly") {
      const targetDay = dayOfWeek || 0;
      const currentDay = now.getDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      nextSendAt.setDate(now.getDate() + daysUntil);
      nextSendAt.setHours(8, 0, 0, 0);
    } else {
      const targetDate = dayOfMonth || 1;
      if (now.getDate() >= targetDate) {
        nextSendAt.setMonth(now.getMonth() + 1);
      }
      nextSendAt.setDate(targetDate);
      nextSendAt.setHours(8, 0, 0, 0);
    }

    // Upsert the schedule
    const { error: upsertError } = await supabaseAdmin
      .from("scheduled_reports")
      .upsert({
        user_id: user.id,
        email,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        include_charts: includeCharts,
        is_active: true,
        next_send_at: nextSendAt.toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (upsertError) {
      console.error("Error saving schedule:", upsertError);
      throw upsertError;
    }

    console.log("Schedule saved, next send at:", nextSendAt);

    // Send confirmation email
    const frequencyText = frequency === "weekly" 
      ? `every ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek || 0]}`
      : `on the ${dayOfMonth}${dayOfMonth === 1 ? "st" : dayOfMonth === 2 ? "nd" : dayOfMonth === 3 ? "rd" : "th"} of each month`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #10b981; margin: 0; font-size: 28px; }
          .header p { color: #64748b; margin-top: 8px; }
          .details { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .details p { margin: 8px 0; color: #334155; }
          .details strong { color: #0f172a; }
          .footer { text-align: center; margin-top: 30px; color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>📊 Report Scheduled!</h1>
              <p>Your automatic financial reports are now set up</p>
            </div>
            
            <div class="details">
              <p><strong>📧 Email:</strong> ${email}</p>
              <p><strong>📅 Frequency:</strong> ${frequency === "weekly" ? "Weekly" : "Monthly"}</p>
              <p><strong>⏰ Delivery:</strong> ${frequencyText}</p>
              <p><strong>📈 Charts:</strong> ${includeCharts ? "Included" : "Text only"}</p>
              <p><strong>📬 First report:</strong> ${nextSendAt.toLocaleDateString()}</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
              You'll receive comprehensive financial reports including:
            </p>
            <ul style="color: #475569; line-height: 1.8;">
              <li>Income & expense summary</li>
              <li>Budget performance analysis</li>
              <li>Savings goals progress</li>
              <li>Spending category breakdown</li>
            </ul>
            
            <div class="footer">
              <p>Powered by CoinsBloom</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CoinsBloom <noreply@coinsbloom.com>",
        to: [email],
        subject: "📊 Your Financial Report Schedule Confirmed",
        html: htmlContent,
      }),
    });

    console.log("Confirmation email sent");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report scheduled successfully",
        schedule: { email, frequency, dayOfWeek, dayOfMonth, nextSendAt }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Schedule report error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
