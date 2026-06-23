import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // This function is called by cron jobs with the anon key
  // verify_jwt is disabled in config.toml so we allow the request
  console.log('Budget reset function invoked');

  try {
    console.log('Starting monthly budget reset...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active budgets with monthly period
    const { data: budgets, error: fetchError } = await supabase
      .from('budgets')
      .select('id, name, spent, amount, user_id')
      .eq('is_active', true)
      .eq('period', 'monthly');

    if (fetchError) {
      console.error('Error fetching budgets:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${budgets?.length || 0} active monthly budgets to reset`);

    if (!budgets || budgets.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active monthly budgets found', reset_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reset each budget's spent amount to 0
    const resetPromises = budgets.map(async (budget) => {
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ 
          spent: 0, 
          start_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', budget.id);

      if (updateError) {
        console.error(`Error resetting budget ${budget.id}:`, updateError);
        return { id: budget.id, success: false, error: updateError.message };
      }

      console.log(`Reset budget: ${budget.name} (was $${budget.spent}/$${budget.amount})`);
      return { id: budget.id, success: true, previous_spent: budget.spent };
    });

    const results = await Promise.all(resetPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Monthly budget reset complete: ${successCount} succeeded, ${failCount} failed`);

    // Process auto-contributions to linked goals
    console.log('Processing auto-contributions to linked goals...');
    const { error: contributionError } = await supabase.rpc('process_monthly_budget_contributions');
    
    if (contributionError) {
      console.error('Error processing auto-contributions:', contributionError);
    } else {
      console.log('Auto-contributions processed successfully');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Monthly budget reset complete',
        reset_count: successCount,
        failed_count: failCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in monthly budget reset:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
