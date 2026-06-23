import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0];

    console.log(`Processing recurring transactions for date: ${today}`);

    // Find all recurring transactions due today or earlier
    const { data: dueTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .not('recurrence_pattern', 'is', null)
      .lte('next_recurrence_date', today);

    if (fetchError) {
      console.error('Error fetching recurring transactions:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueTransactions?.length || 0} recurring transactions to process`);

    let created = 0;
    let errors = 0;

    for (const transaction of dueTransactions || []) {
      try {
        // Create new transaction
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: transaction.user_id,
            account_id: transaction.account_id,
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            type: transaction.type,
            date: today,
            is_recurring: false,
            parent_transaction_id: transaction.id,
            notes: `Auto-generated from recurring transaction`,
          });

        if (insertError) {
          console.error(`Error creating transaction for ${transaction.id}:`, insertError);
          errors++;
          continue;
        }

        created++;

        // Calculate next recurrence date
        const nextDate = calculateNextDate(today, transaction.recurrence_pattern);

        if (nextDate) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ next_recurrence_date: nextDate })
            .eq('id', transaction.id);

          if (updateError) {
            console.error(`Error updating next_recurrence_date for ${transaction.id}:`, updateError);
          }
        }
      } catch (err) {
        console.error(`Error processing transaction ${transaction.id}:`, err);
        errors++;
      }
    }

    console.log(`Completed: ${created} created, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: dueTransactions?.length || 0,
        created,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in process-recurring-transactions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateNextDate(currentDate: string, pattern: string): string | null {
  const date = new Date(currentDate);
  
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date.toISOString().split('T')[0];
}
