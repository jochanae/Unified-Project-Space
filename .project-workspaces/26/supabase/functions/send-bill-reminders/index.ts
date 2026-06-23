import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  user_id: string;
  reminder_days_before: number;
}

interface Profile {
  email: string;
  first_name: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is called by cron jobs with the anon key
  // verify_jwt is disabled in config.toml so we allow the request
  console.log('Bill reminder function invoked');

  try {
    console.log('Starting bill reminder email job...');

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all pending bills with reminders enabled
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, name, amount, due_date, user_id, reminder_days_before')
      .eq('status', 'pending')
      .eq('reminder_enabled', true);

    if (billsError) {
      console.error('Error fetching bills:', billsError);
      throw billsError;
    }

    console.log(`Found ${bills?.length || 0} bills with reminders enabled`);

    if (!bills || bills.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bills to remind', sent_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter bills that need reminders
    const billsToRemind = bills.filter((bill: Bill) => {
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Send reminder if within the reminder window or overdue (but not more than 7 days overdue)
      return daysUntilDue <= bill.reminder_days_before && daysUntilDue >= -7;
    });

    console.log(`${billsToRemind.length} bills need reminders`);

    // Group bills by user
    const billsByUser = billsToRemind.reduce((acc: Record<string, Bill[]>, bill: Bill) => {
      if (!acc[bill.user_id]) {
        acc[bill.user_id] = [];
      }
      acc[bill.user_id].push(bill);
      return acc;
    }, {});

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails for each user
    for (const [userId, userBills] of Object.entries(billsByUser)) {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, first_name')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error(`Could not find profile for user ${userId}:`, profileError);
        errors.push(`User ${userId}: profile not found`);
        continue;
      }

      const userName = profile.first_name || 'there';
      const totalAmount = (userBills as Bill[]).reduce((sum: number, bill: Bill) => sum + Number(bill.amount), 0);

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6, #06b6d4); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .bill-item { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #8b5cf6; }
            .bill-name { font-weight: bold; color: #1f2937; }
            .bill-amount { color: #8b5cf6; font-weight: bold; }
            .overdue { border-left-color: #ef4444; }
            .overdue .bill-amount { color: #ef4444; }
            .total { background: #8b5cf6; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 20px; }
            .cta { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 CoinsBloom Bill Reminder</h1>
            </div>
            <div class="content">
              <p>Hi ${userName}! 👋</p>
              <p>Here are your upcoming bills that need attention:</p>
              
              ${(userBills as Bill[]).map((bill: Bill) => {
                const dueDate = new Date(bill.due_date);
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntilDue < 0;
                const statusText = isOverdue ? 'OVERDUE' : daysUntilDue === 0 ? 'Due Today' : `Due in ${daysUntilDue} days`;
                
                return `
                  <div class="bill-item ${isOverdue ? 'overdue' : ''}">
                    <div class="bill-name">${bill.name}</div>
                    <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                      <span class="bill-amount">$${Number(bill.amount).toFixed(2)}</span>
                      <span style="color: ${isOverdue ? '#ef4444' : '#6b7280'};">${statusText}</span>
                    </div>
                  </div>
                `;
              }).join('')}
              
              <div class="total">
                <strong>Total Due: $${totalAmount.toFixed(2)}</strong>
              </div>
              
              <p style="text-align: center; margin-top: 20px;">
                <a href="https://coinsbloom.lovable.app/bills" class="cta">
                  View & Pay Bills →
                </a>
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this because you have bill reminders enabled in CoinsBloom.</p>
              <p>💚 Stay on top of your finances!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const { error: emailError } = await resend.emails.send({
          from: 'CoinsBloom <noreply@coinsbloom.com>',
          to: [profile.email],
          subject: `📬 Bill Reminder: ${(userBills as Bill[]).length} bill(s) need attention`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          errors.push(`${profile.email}: ${emailError.message}`);
        } else {
          console.log(`Email sent to ${profile.email} for ${(userBills as Bill[]).length} bills`);
          sentCount++;
        }
      } catch (error) {
        console.error(`Failed to send email to ${profile.email}:`, error);
        errors.push(`${profile.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Bill reminder job complete: ${sentCount} emails sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        message: 'Bill reminder job complete',
        sent_count: sentCount,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in bill reminder job:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
