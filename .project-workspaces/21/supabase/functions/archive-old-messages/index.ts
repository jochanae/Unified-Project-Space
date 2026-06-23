import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffISO = cutoffDate.toISOString();

    // Count before deleting so we can log it
    const { count: toArchive } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffISO)
      .eq('role', 'assistant');
    // Keep user messages longer — they're smaller and
    // more meaningful for memory context

    // Delete assistant messages older than 90 days
    // User messages older than 180 days
    const ninetyDaysAgo = cutoffISO;
    const oneEightyDaysAgo = new Date(
      Date.now() - 180 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { error: assistantErr } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .eq('role', 'assistant');

    const { error: userErr } = await supabase
      .from('chat_messages')
      .delete()
      .lt('created_at', oneEightyDaysAgo)
      .eq('role', 'user');

    if (assistantErr) console.error('Assistant archive error:', assistantErr);
    if (userErr) console.error('User archive error:', userErr);

    return new Response(
      JSON.stringify({
        archived: toArchive ?? 0,
        assistantError: assistantErr?.message ?? null,
        userError: userErr?.message ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('archive-old-messages error:', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
