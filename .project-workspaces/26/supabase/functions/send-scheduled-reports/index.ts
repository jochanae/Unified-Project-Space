import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log("Checking for scheduled reports at:", now.toISOString());

    // Get all active schedules that are due
    const { data: dueReports, error: fetchError } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("is_active", true)
      .lte("next_send_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching scheduled reports:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueReports?.length || 0} reports to send`);

    let sent = 0;
    let errors = 0;

    for (const report of dueReports || []) {
      try {
        // Fetch user's financial data
        const { data: transactions } = await supabase
          .from("transactions")
          .select("amount, type, category")
          .eq("user_id", report.user_id)
          .gte("date", new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);

        const income = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const expenses = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        const { data: budgets } = await supabase
          .from("budgets")
          .select("name, amount, spent")
          .eq("user_id", report.user_id)
          .eq("is_active", true);

        const { data: goals } = await supabase
          .from("goals")
          .select("title, target_amount, current_amount")
          .eq("user_id", report.user_id)
          .eq("is_archived", false);

        // Build email content
        const budgetSummary = budgets?.map(b => {
          const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
          return `<li>${b.name}: $${b.spent.toFixed(0)} / $${b.amount.toFixed(0)} (${pct}%)</li>`;
        }).join("") || "<li>No budgets set</li>";

        const goalsSummary = goals?.map(g => {
          const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
          return `<li>${g.title}: $${g.current_amount.toFixed(0)} / $${g.target_amount.toFixed(0)} (${pct}%)</li>`;
        }).join("") || "<li>No goals set</li>";

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .card { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
              .header { text-align: center; margin-bottom: 24px; }
              .header h1 { color: #10b981; margin: 0; }
              .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
              .stat { background: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center; }
              .stat-value { font-size: 24px; font-weight: bold; color: #0f172a; }
              .stat-label { font-size: 12px; color: #64748b; }
              .section { margin: 24px 0; }
              .section h3 { color: #334155; margin-bottom: 12px; }
              .section ul { padding-left: 20px; color: #475569; }
              .section li { margin: 8px 0; }
              .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="card">
                <div class="header">
                  <h1>📊 Your ${report.frequency === "weekly" ? "Weekly" : "Monthly"} Report</h1>
                  <p style="color: #64748b;">${now.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                </div>
                
                <div class="stat-grid">
                  <div class="stat">
                    <div class="stat-value" style="color: #10b981;">$${income.toFixed(0)}</div>
                    <div class="stat-label">Income</div>
                  </div>
                  <div class="stat">
                    <div class="stat-value" style="color: #ef4444;">$${expenses.toFixed(0)}</div>
                    <div class="stat-label">Expenses</div>
                  </div>
                </div>
                
                <div class="stat" style="background: ${income - expenses >= 0 ? '#dcfce7' : '#fee2e2'};">
                  <div class="stat-value" style="color: ${income - expenses >= 0 ? '#16a34a' : '#dc2626'};">
                    ${income - expenses >= 0 ? '+' : ''}$${(income - expenses).toFixed(0)}
                  </div>
                  <div class="stat-label">Net Cash Flow</div>
                </div>
                
                <div class="section">
                  <h3>💰 Budget Status</h3>
                  <ul>${budgetSummary}</ul>
                </div>
                
                <div class="section">
                  <h3>🎯 Savings Goals</h3>
                  <ul>${goalsSummary}</ul>
                </div>
                
                <div class="footer">
                  <p>Powered by CoinsBloom</p>
                  <p style="font-size: 12px;">To manage your report schedule, visit your settings.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "CoinsBloom <noreply@coinsbloom.com>",
            to: [report.email],
            subject: `📊 Your ${report.frequency === "weekly" ? "Weekly" : "Monthly"} Financial Report`,
            html: htmlContent,
          }),
        });

        if (!emailRes.ok) {
          throw new Error(`Email failed: ${await emailRes.text()}`);
        }

        // Calculate next send date
        const nextSendAt = new Date(report.next_send_at);
        if (report.frequency === "weekly") {
          nextSendAt.setDate(nextSendAt.getDate() + 7);
        } else {
          nextSendAt.setMonth(nextSendAt.getMonth() + 1);
        }

        // Update schedule
        await supabase
          .from("scheduled_reports")
          .update({
            last_sent_at: now.toISOString(),
            next_send_at: nextSendAt.toISOString(),
          })
          .eq("id", report.id);

        sent++;
        console.log(`Sent report to ${report.email}`);
      } catch (err) {
        console.error(`Error sending report to ${report.email}:`, err);
        errors++;
      }
    }

    console.log(`Completed: ${sent} sent, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, sent, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-scheduled-reports:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
