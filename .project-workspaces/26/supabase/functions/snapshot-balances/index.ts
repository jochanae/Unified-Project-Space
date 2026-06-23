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

  console.log('Daily balance snapshot function invoked');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active accounts
    const { data: accounts, error: fetchError } = await supabase
      .from('accounts')
      .select('id, user_id, balance');

    if (fetchError) {
      console.error('Error fetching accounts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${accounts?.length || 0} accounts to snapshot`);

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No accounts found', snapshot_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Create snapshots for each account (upsert to handle duplicates)
    const snapshots = accounts.map(account => ({
      user_id: account.user_id,
      account_id: account.id,
      balance: account.balance,
      snapshot_date: today,
    }));

    // Batch insert with upsert (update if exists for today)
    const { data: insertedSnapshots, error: insertError } = await supabase
      .from('account_balance_history')
      .upsert(snapshots, { 
        onConflict: 'account_id,snapshot_date',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Error inserting snapshots:', insertError);
      throw insertError;
    }

    const snapshotCount = insertedSnapshots?.length || snapshots.length;
    console.log(`Successfully created/updated ${snapshotCount} balance snapshots for ${today}`);

    return new Response(
      JSON.stringify({ 
        message: 'Daily balance snapshots complete',
        snapshot_count: snapshotCount,
        snapshot_date: today
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in daily balance snapshot:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
