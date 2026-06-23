// Cron-triggered: scan untriggered price alerts, fetch live quotes from Yahoo,
// fire push notifications via send-push-notification, and mark alerts triggered.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: "above" | "below";
  notes: string | null;
}

async function fetchQuote(symbol: string): Promise<number | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { Accept: "application/json", "User-Agent": UA } },
    );
    if (!r.ok) return null;
    const data = await r.json();
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: alerts, error } = await supabase
      .from("bloom_price_alerts")
      .select("id, user_id, symbol, target_price, direction, notes")
      .eq("is_triggered", false);

    if (error) throw error;
    if (!alerts || alerts.length === 0) {
      return json({ success: true, checked: 0, fired: 0 });
    }

    // Group by symbol so we fetch each quote once.
    const bySymbol = new Map<string, Alert[]>();
    for (const a of alerts as Alert[]) {
      const list = bySymbol.get(a.symbol) ?? [];
      list.push(a);
      bySymbol.set(a.symbol, list);
    }

    let fired = 0;
    const firedIds: string[] = [];

    for (const [symbol, group] of bySymbol) {
      const price = await fetchQuote(symbol);
      if (price === null) {
        console.log(`[check-price-alerts] No quote for ${symbol}`);
        continue;
      }

      for (const alert of group) {
        const hit =
          (alert.direction === "above" && price >= alert.target_price) ||
          (alert.direction === "below" && price <= alert.target_price);
        if (!hit) continue;

        // Fan out a push notification
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: alert.user_id,
              title: `${symbol} ${alert.direction} $${alert.target_price}`,
              body: `${symbol} is now $${price.toFixed(2)} (target $${alert.target_price.toFixed(2)} ${alert.direction}).`,
              tag: `price-alert-${alert.id}`,
              url: "/dashboard",
            },
          });
        } catch (e) {
          console.error(`[check-price-alerts] push failed for ${alert.id}`, e);
        }

        firedIds.push(alert.id);
        fired++;
      }
    }

    if (firedIds.length > 0) {
      await supabase
        .from("bloom_price_alerts")
        .update({ is_triggered: true, triggered_at: new Date().toISOString() })
        .in("id", firedIds);
    }

    return json({ success: true, checked: alerts.length, fired });
  } catch (err) {
    console.error("check-price-alerts error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
