import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting allowance processing with bucket splits...");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active allowances that are due
    const today = new Date().toISOString().split('T')[0];
    
    const { data: dueAllowances, error: fetchError } = await supabase
      .from('kid_allowances')
      .select(`
        *, 
        kids_profiles(
          id, 
          display_name, 
          spend_balance, 
          save_balance, 
          give_balance, 
          total_earned,
          split_spend_percent,
          split_save_percent,
          split_give_percent
        )
      `)
      .eq('is_active', true)
      .lte('next_payout_date', today);

    if (fetchError) {
      console.error("Error fetching allowances:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${dueAllowances?.length || 0} allowances to process`);

    const results: { kidId: string; amount: number; success: boolean; splits?: { spend: number; save: number; give: number } }[] = [];

    for (const allowance of dueAllowances || []) {
      try {
        const kidProfile = allowance.kids_profiles;
        if (!kidProfile) {
          console.error(`No profile found for allowance ${allowance.id}`);
          results.push({ kidId: allowance.kid_id, amount: allowance.amount, success: false });
          continue;
        }

        console.log(`Processing allowance for kid ${allowance.kid_id}: $${allowance.amount}`);

        // Get split percentages (default to 100% spend if not set)
        const spendPercent = kidProfile.split_spend_percent ?? 100;
        const savePercent = kidProfile.split_save_percent ?? 0;
        const givePercent = kidProfile.split_give_percent ?? 0;

        // Calculate split amounts
        const spendAmount = allowance.amount * (spendPercent / 100);
        const saveAmount = allowance.amount * (savePercent / 100);
        const giveAmount = allowance.amount * (givePercent / 100);

        console.log(`Split breakdown - Spend: $${spendAmount.toFixed(2)}, Save: $${saveAmount.toFixed(2)}, Give: $${giveAmount.toFixed(2)}`);

        // Create transaction with split info
        const { error: transactionError } = await supabase
          .from('kid_transactions')
          .insert({
            kid_id: allowance.kid_id,
            type: 'allowance',
            amount: allowance.amount,
            description: `${allowance.frequency.charAt(0).toUpperCase() + allowance.frequency.slice(1)} allowance`,
            bucket: 'split',
          });

        if (transactionError) {
          console.error(`Transaction error for kid ${allowance.kid_id}:`, transactionError);
          results.push({ kidId: allowance.kid_id, amount: allowance.amount, success: false });
          continue;
        }

        // Update kid's bucket balances
        const { error: updateError } = await supabase
          .from('kids_profiles')
          .update({
            spend_balance: (kidProfile.spend_balance ?? 0) + spendAmount,
            save_balance: (kidProfile.save_balance ?? 0) + saveAmount,
            give_balance: (kidProfile.give_balance ?? 0) + giveAmount,
            total_earned: (kidProfile.total_earned ?? 0) + allowance.amount,
          })
          .eq('id', allowance.kid_id);

        if (updateError) {
          console.error(`Balance update error for kid ${allowance.kid_id}:`, updateError);
        }

        // Calculate next payout date
        let nextDate = new Date(allowance.next_payout_date);
        if (allowance.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (allowance.frequency === 'biweekly') {
          nextDate.setDate(nextDate.getDate() + 14);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }

        // Update allowance with next payout date
        const { error: allowanceUpdateError } = await supabase
          .from('kid_allowances')
          .update({
            next_payout_date: nextDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', allowance.id);

        if (allowanceUpdateError) {
          console.error(`Allowance update error:`, allowanceUpdateError);
        }

        results.push({ 
          kidId: allowance.kid_id, 
          amount: allowance.amount, 
          success: true,
          splits: { spend: spendAmount, save: saveAmount, give: giveAmount }
        });
        console.log(`Successfully processed allowance for kid ${allowance.kid_id} with bucket splits`);

      } catch (err) {
        console.error(`Error processing allowance ${allowance.id}:`, err);
        results.push({ kidId: allowance.kid_id, amount: allowance.amount, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Allowance processing complete. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        message: "Allowance processing complete",
        processed: results.length,
        successful: successCount,
        failed: failCount,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in process-allowances:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
