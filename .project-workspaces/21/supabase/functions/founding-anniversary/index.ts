import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find users whose claim anniversary is today
    const { data: anniversaryUsers, error: fetchErr } = await supabase
      .from("beta_serial_numbers")
      .select("user_id, serial_number, claimed_at");

    if (fetchErr) throw fetchErr;
    if (!anniversaryUsers || anniversaryUsers.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const todayMonth = today.getUTCMonth();
    const todayDay = today.getUTCDate();
    let inserted = 0;

    for (const row of anniversaryUsers) {
      const claimed = new Date(row.claimed_at);
      const claimedMonth = claimed.getUTCMonth();
      const claimedDay = claimed.getUTCDate();

      // Not an anniversary today
      if (claimedMonth !== todayMonth || claimedDay !== todayDay) continue;

      const yearsAgo = today.getUTCFullYear() - claimed.getUTCFullYear();
      if (yearsAgo < 1) continue;

      // Check if we already sent this anniversary notification
      const yearLabel = yearsAgo === 1 ? "1 year" : `${yearsAgo} years`;
      const type = `anniversary_${yearsAgo}`;

      const { data: existing } = await supabase
        .from("founding_notifications")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("type", type)
        .maybeSingle();

      if (existing) continue;

      const tier = row.serial_number <= 100 ? "Genesis Architect" : "Foundation Member";
      const message =
        yearsAgo === 1
          ? `One year ago, you claimed your place at the beginning. #${String(row.serial_number).padStart(3, "0")} · ${tier}.`
          : `${yearLabel} ago, you became ${tier} #${String(row.serial_number).padStart(3, "0")}. Still here. Still first.`;

      const { error: insertErr } = await supabase
        .from("founding_notifications")
        .insert({
          user_id: row.user_id,
          type,
          serial_number: row.serial_number,
          message,
        });

      if (!insertErr) inserted++;
    }

    return new Response(JSON.stringify({ processed: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
