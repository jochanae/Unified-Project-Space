import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for cron secret (internal service-to-service calls)
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Require either cron secret or valid service role key
    const validCronSecret = cronSecret === Deno.env.get("CRON_SECRET");
    const validServiceAuth = authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY!);
    
    if (!validCronSecret && !validServiceAuth) {
      console.error("Unauthorized: Invalid authentication");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Input validation
    const { user_id, sync_type, status, accounts_synced, error_message } = body;
    
    if (!user_id || typeof user_id !== 'string' || user_id.length > 100) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!['scheduled', 'manual'].includes(sync_type)) {
      return new Response(
        JSON.stringify({ error: "Invalid sync_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!['success', 'error'].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending sync notification for user ${user_id}: ${status}`);

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Could not find user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user notification preferences
    const { data: settings } = await supabase
      .from("user_settings")
      .select("sync_notifications_enabled")
      .eq("user_id", user_id)
      .maybeSingle();

    // If notifications are explicitly disabled, skip
    if (settings?.sync_notifications_enabled === false) {
      console.log("User has disabled sync notifications");
      return new Response(
        JSON.stringify({ skipped: true, reason: "notifications_disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.first_name || "there";
    const syncTypeLabel = sync_type === "scheduled" ? "Scheduled" : "Manual";
    const safeAccountsSynced = typeof accounts_synced === 'number' ? accounts_synced : 0;
    const safeErrorMessage = typeof error_message === 'string' ? error_message.slice(0, 500) : 'Unknown error';

    let subject: string;
    let htmlContent: string;

    if (status === "success") {
      subject = `✅ ${syncTypeLabel} Sync Complete - ${safeAccountsSynced} Account${safeAccountsSynced !== 1 ? "s" : ""} Updated`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; }
            .stat { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .stat-number { font-size: 32px; font-weight: 700; color: #7c3aed; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 CoinsBloom</h1>
            </div>
            <div class="content">
              <p>Hi ${userName}!</p>
              <p><span class="success-badge">✓ Sync Complete</span></p>
              <div class="stat">
                <div class="stat-number">${safeAccountsSynced}</div>
                <div>Account${safeAccountsSynced !== 1 ? "s" : ""} synced successfully</div>
              </div>
              <p>Your account balances are now up to date. Visit CoinsBloom to view your latest financial snapshot.</p>
            </div>
            <div class="footer">
              <p>You received this because you have sync notifications enabled.</p>
              <p>Manage your preferences in Settings.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      subject = `⚠️ ${syncTypeLabel} Sync Failed - Action May Be Required`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .error-badge { background: #ef4444; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; }
            .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 CoinsBloom</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p><span class="error-badge">⚠ Sync Failed</span></p>
              <div class="error-box">
                <strong>Error:</strong> ${safeErrorMessage}
              </div>
              <p><strong>What to do:</strong></p>
              <ul>
                <li>Try syncing again manually from your Accounts page</li>
                <li>If the issue persists, you may need to re-link your bank account</li>
                <li>Contact support if you continue to experience problems</li>
              </ul>
            </div>
            <div class="footer">
              <p>You received this because you have sync notifications enabled.</p>
              <p>Manage your preferences in Settings.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CoinsBloom <notifications@coinsbloom.com>",
        to: [profile.email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", details: emailResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email notification sent successfully:", emailResult.id);

    // Also create an in-app notification
    const notificationTitle = status === "success" 
      ? `Sync Complete: ${safeAccountsSynced} account${safeAccountsSynced !== 1 ? "s" : ""} updated`
      : "Sync Failed - Action Required";
    
    const notificationMessage = status === "success"
      ? `Your ${syncTypeLabel.toLowerCase()} account sync completed successfully.`
      : `Your ${syncTypeLabel.toLowerCase()} sync failed: ${safeErrorMessage}. Please try again.`;

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: status === "success" ? "sync" : "error",
        action_url: "/accounts"
      });

    if (notifError) {
      console.error("Failed to create in-app notification:", notifError);
    } else {
      console.log("In-app notification created");
    }

    return new Response(
      JSON.stringify({ success: true, email_id: emailResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Sync notification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
