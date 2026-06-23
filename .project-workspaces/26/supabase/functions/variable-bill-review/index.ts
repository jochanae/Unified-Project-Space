import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface VariableBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
}

interface UserWithBills {
  user_id: string;
  email: string;
  first_name: string | null;
  bills: VariableBill[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[VARIABLE-BILL-REVIEW] Starting monthly variable bill review job...');

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.toLocaleString('en-US', { month: 'long' });

    console.log(`[VARIABLE-BILL-REVIEW] Today is day ${currentDay} of ${currentMonth}`);

    // Get users who have variable_review_enabled and today is their review day
    const { data: usersToNotify, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, variable_review_day, variable_review_enabled')
      .eq('variable_review_enabled', true)
      .eq('variable_review_day', currentDay);

    if (usersError) {
      console.error('[VARIABLE-BILL-REVIEW] Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`[VARIABLE-BILL-REVIEW] Found ${usersToNotify?.length || 0} users with review day today`);

    if (!usersToNotify || usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify today', sent_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const errors: string[] = [];

    for (const user of usersToNotify) {
      // Get variable bills for this user (pending status, due this month or next month)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);

      const { data: variableBills, error: billsError } = await supabase
        .from('bills')
        .select('id, name, amount, due_date, category')
        .eq('user_id', user.id)
        .eq('is_variable_amount', true)
        .eq('status', 'pending')
        .gte('due_date', monthStart.toISOString().split('T')[0])
        .lte('due_date', nextMonthEnd.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (billsError) {
        console.error(`[VARIABLE-BILL-REVIEW] Error fetching bills for user ${user.id}:`, billsError);
        errors.push(`User ${user.id}: ${billsError.message}`);
        continue;
      }

      if (!variableBills || variableBills.length === 0) {
        console.log(`[VARIABLE-BILL-REVIEW] No variable bills for user ${user.id}`);
        continue;
      }

      console.log(`[VARIABLE-BILL-REVIEW] User ${user.id} has ${variableBills.length} variable bills to review`);

      const userName = user.first_name || 'there';
      const totalEstimated = variableBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
      const notificationTitle = `📊 ${currentMonth} Variable Bills Review`;
      const notificationBody = `You have ${variableBills.length} variable bill${variableBills.length > 1 ? 's' : ''} totaling ~$${totalEstimated.toFixed(2)}. Review and update amounts before they're due.`;

      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: notificationTitle,
          message: notificationBody,
          type: 'info',
          is_read: false,
          action_url: '/bills?filter=variable'
        });

      if (notifError) {
        console.error(`[VARIABLE-BILL-REVIEW] Error creating notification for user ${user.id}:`, notifError);
      } else {
        notificationsCreated++;
      }

      // Send push notification
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            title: notificationTitle,
            body: notificationBody,
            tag: 'variable-bill-review',
            url: '/bills?filter=variable'
          }),
        });
        
        if (pushResponse.ok) {
          console.log(`[VARIABLE-BILL-REVIEW] Push sent to user ${user.id}`);
        } else {
          console.log(`[VARIABLE-BILL-REVIEW] Push skipped for user ${user.id}: ${await pushResponse.text()}`);
        }
      } catch (pushError) {
        console.log(`[VARIABLE-BILL-REVIEW] Push error for user ${user.id}:`, pushError);
      }

      // Send email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .tip-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .tip-box strong { color: #b45309; }
            .bill-item { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #f97316; display: flex; justify-content: space-between; }
            .bill-name { font-weight: bold; color: #1f2937; }
            .bill-amount { color: #f97316; font-weight: bold; }
            .bill-date { color: #6b7280; font-size: 12px; }
            .total { background: #f97316; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
            .cta { display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 ${currentMonth} Variable Bills Review</h1>
            </div>
            <div class="content">
              <p>Hi ${userName}! 👋</p>
              
              <div class="tip-box">
                <strong>💡 Why review variable bills?</strong><br>
                These bills change each month (utilities, credit cards, etc.). Check your statements and update the amounts before payment to avoid surprises.
              </div>
              
              <p><strong>${variableBills.length} variable bill${variableBills.length > 1 ? 's' : ''} to review:</strong></p>
              
              ${variableBills.map((bill: VariableBill) => {
                const dueDate = new Date(bill.due_date);
                const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return `
                  <div class="bill-item">
                    <div>
                      <div class="bill-name">${bill.name}</div>
                      <div class="bill-date">Due ${formattedDate} • ${bill.category}</div>
                    </div>
                    <div class="bill-amount">~$${Number(bill.amount).toFixed(2)}</div>
                  </div>
                `;
              }).join('')}
              
              <div class="total">
                <strong>Estimated Total: ~$${totalEstimated.toFixed(2)}</strong>
              </div>
              
              <p style="text-align: center; margin-top: 20px;">
                <a href="https://coinsbloom.lovable.app/bills?filter=variable" class="cta">
                  Review & Update Bills →
                </a>
              </p>
              
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
                Tip: Once you confirm the amounts, the actual payment will be accurate. You can also enable AutoPay for fixed-amount bills.
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this because you enabled monthly variable bill reviews in CoinsBloom.</p>
              <p>💚 Stay on top of your finances!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'CoinsBloom <noreply@coinsbloom.com>',
          to: [user.email],
          subject: `📊 ${currentMonth} Variable Bills: ${variableBills.length} bill${variableBills.length > 1 ? 's' : ''} to review`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[VARIABLE-BILL-REVIEW] Error sending email to ${user.email}:`, emailError);
          errors.push(`${user.email}: ${emailError.message}`);
        } else {
          console.log(`[VARIABLE-BILL-REVIEW] Email sent to ${user.email}`);
          emailsSent++;
        }
      } catch (error) {
        console.error(`[VARIABLE-BILL-REVIEW] Failed to send email to ${user.email}:`, error);
        errors.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[VARIABLE-BILL-REVIEW] Complete: ${emailsSent} emails, ${notificationsCreated} notifications, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        message: 'Variable bill review job complete',
        emails_sent: emailsSent,
        notifications_created: notificationsCreated,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VARIABLE-BILL-REVIEW] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
