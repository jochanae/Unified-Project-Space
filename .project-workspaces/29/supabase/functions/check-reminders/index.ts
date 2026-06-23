import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Web Push implementation using native crypto
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: unknown }> {
  try {
    // Import web-push dynamically
    const webpush = await import("https://esm.sh/web-push@3.6.7");
    
    webpush.setVapidDetails(
      'mailto:support@intoiq.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };
    
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    console.log(`[CHECK-REMINDERS] Push sent to: ${subscription.endpoint}`);
    return { success: true };
  } catch (error: unknown) {
    console.error('[CHECK-REMINDERS] Push error:', error);
    const statusCode = (error as { statusCode?: number })?.statusCode;
    return { success: false, statusCode, error };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECK-REMINDERS] Starting reminder check...');
    
    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const webPushReady = !!(vapidPublicKey && vapidPrivateKey);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Find reminders that are due (within the last 5 minutes or up to now)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const { data: dueReminders, error: reminderError } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_completed', false)
      .eq('is_dismissed', false)
      .lte('trigger_at', now.toISOString())
      .gte('trigger_at', fiveMinutesAgo.toISOString());
    
    if (reminderError) {
      console.error('[CHECK-REMINDERS] Error fetching reminders:', reminderError);
      throw reminderError;
    }
    
    console.log(`[CHECK-REMINDERS] Found ${dueReminders?.length || 0} due reminders`);
    
    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No due reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let notificationsSent = 0;
    
    for (const reminder of dueReminders) {
      console.log(`[CHECK-REMINDERS] Processing reminder: ${reminder.id} - ${reminder.title}`);
      
      // Check if we already sent a notification for this reminder recently
      const { data: existingNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', reminder.user_id)
        .eq('metadata->>reminder_id', reminder.id)
        .gte('created_at', fiveMinutesAgo.toISOString())
        .single();
      
      if (existingNotif) {
        console.log(`[CHECK-REMINDERS] Already notified for reminder: ${reminder.id}`);
        continue;
      }
      
      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', reminder.user_id);
      
      // Create in-app notification
      const typeEmoji = reminder.type === 'trade' ? '📈' : reminder.type === 'learning' ? '📚' : '📝';
      
      const notificationTitle = `${typeEmoji} Reminder: ${reminder.title}`;
      const notificationBody = reminder.description || `It's time for your ${reminder.type} reminder!`;
      
      // Send push notifications if user has subscriptions and web-push is ready
      let pushSentCount = 0;
      if (webPushReady && subscriptions && subscriptions.length > 0) {
        console.log(`[CHECK-REMINDERS] Sending push to ${subscriptions.length} subscriptions`);
        
        for (const sub of subscriptions) {
          const result = await sendWebPush(
            sub, 
            {
              title: notificationTitle,
              body: notificationBody,
              tag: `reminder-${reminder.id}`,
              action_url: '/reminders',
            },
            vapidPublicKey!,
            vapidPrivateKey!
          );
          
          if (result.success) {
            pushSentCount++;
          } else {
            // If push fails (e.g., expired subscription), remove it
            if (result.statusCode === 410) {
              console.log(`[CHECK-REMINDERS] Removing expired subscription: ${sub.endpoint}`);
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', sub.endpoint);
            }
          }
        }
      }
      
      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: reminder.user_id,
        title: notificationTitle,
        message: notificationBody,
        type: 'reminder',
        action_url: '/reminders',
        metadata: { 
          reminder_id: reminder.id,
          push_sent: pushSentCount > 0,
          push_sent_count: pushSentCount,
          subscription_count: subscriptions?.length || 0
        }
      });
      
      notificationsSent++;
      
      // Handle repeating reminders
      if (reminder.repeat_interval && reminder.repeat_interval !== 'none') {
        const currentTrigger = new Date(reminder.trigger_at);
        let nextTrigger: Date;
        
        switch (reminder.repeat_interval) {
          case 'daily':
            nextTrigger = new Date(currentTrigger.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            nextTrigger = new Date(currentTrigger.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            nextTrigger = new Date(currentTrigger);
            nextTrigger.setMonth(nextTrigger.getMonth() + 1);
            break;
          default:
            nextTrigger = currentTrigger;
        }
        
        // Update the trigger_at for the next occurrence
        await supabase
          .from('reminders')
          .update({ trigger_at: nextTrigger.toISOString() })
          .eq('id', reminder.id);
        
        console.log(`[CHECK-REMINDERS] Updated repeating reminder ${reminder.id} to next trigger: ${nextTrigger.toISOString()}`);
      }
    }
    
    console.log(`[CHECK-REMINDERS] Processed ${notificationsSent} reminder notifications`);

    // === BILLS DUE SOON CHECK ===
    let billNotificationsSent = 0;
    try {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowDay = tomorrow.getDate();
      const todayDay = now.getDate();

      console.log(`[CHECK-REMINDERS] Checking unpaid bills (due tomorrow, today, or overdue)`);

      // Find ALL unpaid bills this month — we'll classify them in code
      const { data: dueBills, error: billError } = await supabase
        .from('bills')
        .select('id, name, amount, due_day, user_id, category')
        .eq('is_paid_this_month', false);

      if (billError) {
        console.error('[CHECK-REMINDERS] Error fetching bills:', billError);
      } else if (dueBills && dueBills.length > 0) {
        // Filter to overdue, due today, or due tomorrow
        const relevantBills = dueBills.filter(bill => bill.due_day <= tomorrowDay);
        console.log(`[CHECK-REMINDERS] Found ${relevantBills.length} unpaid bills due soon or overdue`);

        for (const bill of relevantBills) {
          // Check if we already notified about this bill today
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const { data: existingBillNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', bill.user_id)
            .eq('metadata->>bill_id', bill.id)
            .gte('created_at', todayStart.toISOString())
            .single();

          if (existingBillNotif) {
            console.log(`[CHECK-REMINDERS] Already notified for bill: ${bill.name}`);
            continue;
          }

          const isOverdue = bill.due_day < todayDay;
          const isDueToday = bill.due_day === todayDay;
          const urgency = isOverdue ? '⚠️' : isDueToday ? '🚨' : '📅';
          const timing = isOverdue ? `overdue (was due on the ${bill.due_day}${getOrdinalSuffix(bill.due_day)})` : isDueToday ? 'due today' : 'due tomorrow';
          const billTitle = `${urgency} Bill ${timing}: ${bill.name}`;
          const billBody = `$${Number(bill.amount).toFixed(2)} — ${bill.category}. ${isOverdue ? 'This bill is past due!' : "Don't forget to pay!"}`;

          // Use send-push-notification function (handles push + in-app notification)
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                user_id: bill.user_id,
                title: billTitle,
                body: billBody,
                action_url: '/my-finances',
                tag: `bill-${bill.id}`,
              }),
            });
            billNotificationsSent++;
            console.log(`[CHECK-REMINDERS] Bill notification sent for: ${bill.name}`);
          } catch (pushErr) {
            console.error(`[CHECK-REMINDERS] Error sending bill push:`, pushErr);
          }
        }
      } else {
        console.log('[CHECK-REMINDERS] No unpaid bills due soon');
      }
    } catch (billCheckError) {
      console.error('[CHECK-REMINDERS] Bill check error:', billCheckError);
    }

    console.log(`[CHECK-REMINDERS] Done — ${notificationsSent} reminder + ${billNotificationsSent} bill notifications`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_processed: notificationsSent,
        bills_processed: billNotificationsSent,
        total_due: dueReminders.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[CHECK-REMINDERS] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
