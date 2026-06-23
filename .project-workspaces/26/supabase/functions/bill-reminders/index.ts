import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  is_autopay: boolean;
  is_variable_amount: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[BILL-REMINDERS] Starting bill reminder check...');

    const today = new Date();

    // Get all pending bills with reminders enabled
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('id, user_id, name, amount, due_date, is_autopay, is_variable_amount, reminder_enabled, reminder_days_before')
      .eq('status', 'pending')
      .eq('reminder_enabled', true);

    if (billsError) {
      console.error('[BILL-REMINDERS] Error fetching bills:', billsError);
      throw billsError;
    }

    console.log(`[BILL-REMINDERS] Found ${bills?.length || 0} bills with reminders enabled`);

    let notificationsCreated = 0;
    let notificationsSkipped = 0;
    let pushSent = 0;

    // Collect push notifications to send grouped by user
    const pushByUser: Record<string, { title: string; body: string; tag: string; url: string }[]> = {};

    for (const bill of (bills || []) as Bill[]) {
      const dueDate = new Date(bill.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Check if bill is within reminder window
      if (daysUntilDue <= bill.reminder_days_before && daysUntilDue >= 0) {
        // Check if we already sent a notification for this bill this period
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', bill.user_id)
          .eq('action_url', `/bills?highlight=${bill.id}`)
          .gte('created_at', new Date(today.getTime() - bill.reminder_days_before * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingNotification && existingNotification.length > 0) {
          console.log(`[BILL-REMINDERS] Skipping ${bill.name} - notification already sent`);
          notificationsSkipped++;
          continue;
        }

        // Build notification message
        let title = '';
        let message = '';
        let type = 'info';

        if (daysUntilDue === 0) {
          title = `${bill.name} is due today!`;
          type = 'warning';
        } else if (daysUntilDue === 1) {
          title = `${bill.name} is due tomorrow`;
          type = 'warning';
        } else {
          title = `${bill.name} due in ${daysUntilDue} days`;
        }

        // Build message based on bill type
        const amountStr = `$${bill.amount.toFixed(2)}`;
        
        if (bill.is_autopay && bill.is_variable_amount) {
          message = `AutoPay scheduled for ${amountStr}. Amount may vary - please verify before payment.`;
          type = 'warning';
        } else if (bill.is_autopay) {
          message = `AutoPay will process ${amountStr} on the due date.`;
        } else if (bill.is_variable_amount) {
          message = `Estimated ${amountStr}. Amount may vary - please check your statement.`;
          type = 'warning';
        } else {
          message = `${amountStr} due on ${new Date(bill.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`;
        }

        // Create the in-app notification
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: bill.user_id,
            title,
            message,
            type,
            is_read: false,
            action_url: `/bills?highlight=${bill.id}`
          });

        if (insertError) {
          console.error(`[BILL-REMINDERS] Error creating notification for ${bill.name}:`, insertError);
        } else {
          console.log(`[BILL-REMINDERS] Created notification for ${bill.name}`);
          notificationsCreated++;

          // Queue push notification for this user
          if (!pushByUser[bill.user_id]) {
            pushByUser[bill.user_id] = [];
          }
          pushByUser[bill.user_id].push({
            title: daysUntilDue === 0 ? `🔔 ${title}` : `📅 ${title}`,
            body: message,
            tag: `bill-${bill.id}-${bill.due_date}`,
            url: `/bills?highlight=${bill.id}`,
          });
        }
      }
    }

    // Send push notifications for each user
    for (const [userId, notifications] of Object.entries(pushByUser)) {
      for (const notif of notifications) {
        try {
          const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: userId,
              title: notif.title,
              body: notif.body,
              tag: notif.tag,
              url: notif.url,
            }),
          });

          if (pushResponse.ok) {
            const result = await pushResponse.json();
            pushSent += result.sent || 0;
            console.log(`[BILL-REMINDERS] Push sent for user ${userId}: ${result.sent} delivered`);
          } else {
            const errText = await pushResponse.text();
            console.error(`[BILL-REMINDERS] Push failed for user ${userId}: ${errText}`);
          }
        } catch (err) {
          console.error(`[BILL-REMINDERS] Error calling push function for ${userId}:`, err);
        }
      }
    }

    console.log(`[BILL-REMINDERS] Complete: ${notificationsCreated} created, ${notificationsSkipped} skipped, ${pushSent} push sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: notificationsCreated,
        notifications_skipped: notificationsSkipped,
        push_sent: pushSent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[BILL-REMINDERS] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
