import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: "above" | "below";
  notes: string | null;
}

// Fetch price using Yahoo Finance v8 chart endpoint (more reliable than v7 quote)
async function fetchPriceFromYahooChart(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com/",
        "Origin": "https://finance.yahoo.com",
      },
    });

    if (!response.ok) {
      console.log(`[YAHOO-CHART] ${symbol} returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    
    if (meta?.regularMarketPrice) {
      return meta.regularMarketPrice;
    }
    
    return null;
  } catch (error) {
    console.error(`[YAHOO-CHART] Error fetching ${symbol}:`, error);
    return null;
  }
}

// Backup: Use AlphaVantage free tier (5 calls/min, 500 calls/day)
async function fetchPriceFromAlphaVantage(symbol: string): Promise<number | null> {
  try {
    // AlphaVantage demo key - replace with real key for production
    const apiKey = Deno.env.get("ALPHAVANTAGE_API_KEY") || "demo";
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const price = parseFloat(data?.["Global Quote"]?.["05. price"]);
    
    return isNaN(price) ? null : price;
  } catch (error) {
    console.error(`[ALPHAVANTAGE] Error fetching ${symbol}:`, error);
    return null;
  }
}

// Fetch prices for multiple symbols with fallback
async function fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  
  if (symbols.length === 0) return priceMap;

  // Fetch all symbols in parallel using Yahoo Chart endpoint
  const promises = symbols.map(async (symbol) => {
    // Try Yahoo Chart first
    let price = await fetchPriceFromYahooChart(symbol);
    
    // Fallback to AlphaVantage if Yahoo fails
    if (price === null) {
      console.log(`[CHECK-PRICE-ALERTS] Yahoo failed for ${symbol}, trying AlphaVantage...`);
      price = await fetchPriceFromAlphaVantage(symbol);
    }
    
    if (price !== null) {
      priceMap.set(symbol.toUpperCase(), price);
    }
  });

  await Promise.all(promises);
  
  return priceMap;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECK-PRICE-ALERTS] Starting price alert check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active (non-triggered) price alerts
    const { data: activeAlerts, error: alertsError } = await supabase
      .from("price_alerts")
      .select("id, user_id, symbol, target_price, direction, notes")
      .eq("is_triggered", false);

    if (alertsError) {
      console.error("[CHECK-PRICE-ALERTS] Error fetching alerts:", alertsError);
      throw alertsError;
    }

    if (!activeAlerts || activeAlerts.length === 0) {
      console.log("[CHECK-PRICE-ALERTS] No active alerts to check");
      return new Response(
        JSON.stringify({ message: "No active alerts", checked: 0, triggered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CHECK-PRICE-ALERTS] Found ${activeAlerts.length} active alerts`);

    // Get unique symbols
    const uniqueSymbols = [...new Set(activeAlerts.map((a: PriceAlert) => a.symbol.toUpperCase()))];
    console.log(`[CHECK-PRICE-ALERTS] Fetching prices for symbols: ${uniqueSymbols.join(", ")}`);

    // Fetch current prices
    const currentPrices = await fetchCurrentPrices(uniqueSymbols);
    console.log(`[CHECK-PRICE-ALERTS] Got prices for ${currentPrices.size} symbols`);

    // Check each alert
    const triggeredAlerts: PriceAlert[] = [];
    const now = new Date().toISOString();

    for (const alert of activeAlerts as PriceAlert[]) {
      const currentPrice = currentPrices.get(alert.symbol.toUpperCase());
      
      if (currentPrice === undefined) {
        console.log(`[CHECK-PRICE-ALERTS] No price found for ${alert.symbol}`);
        continue;
      }

      let shouldTrigger = false;
      
      if (alert.direction === "above" && currentPrice >= alert.target_price) {
        shouldTrigger = true;
      } else if (alert.direction === "below" && currentPrice <= alert.target_price) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        console.log(`[CHECK-PRICE-ALERTS] Triggering alert for ${alert.symbol}: ${currentPrice} ${alert.direction} ${alert.target_price}`);
        triggeredAlerts.push(alert);

        // Update the alert as triggered
        const { error: updateError } = await supabase
          .from("price_alerts")
          .update({ is_triggered: true, triggered_at: now })
          .eq("id", alert.id);

        if (updateError) {
          console.error(`[CHECK-PRICE-ALERTS] Error updating alert ${alert.id}:`, updateError);
          continue;
        }

        // Create a notification for the user
        const directionText = alert.direction === "above" ? "rose above" : "fell below";
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: alert.user_id,
            title: `🔔 ${alert.symbol} Price Alert!`,
            message: `${alert.symbol} ${directionText} your target of $${alert.target_price.toFixed(2)}. Current price: $${currentPrice.toFixed(2)}${alert.notes ? ` — ${alert.notes}` : ""}`,
            type: "trade",
            action_url: "/dashboard",
          });

        if (notifError) {
          console.error(`[CHECK-PRICE-ALERTS] Error creating notification:`, notifError);
        }

        // Also try to send push notification if user has subscription
        try {
          const { data: pushSubs } = await supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", alert.user_id);

          if (pushSubs && pushSubs.length > 0) {
            // Call the send-push-notification function for each subscription
            for (const sub of pushSubs) {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  subscription: {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  title: `🔔 ${alert.symbol} Price Alert!`,
                  body: `${alert.symbol} ${directionText} $${alert.target_price.toFixed(2)}. Now: $${currentPrice.toFixed(2)}`,
                  url: "/dashboard",
                }),
              });
            }
          }
        } catch (pushError) {
          console.error("[CHECK-PRICE-ALERTS] Error sending push notification:", pushError);
        }
      }
    }

    console.log(`[CHECK-PRICE-ALERTS] Checked ${activeAlerts.length} alerts, triggered ${triggeredAlerts.length}`);

    return new Response(
      JSON.stringify({
        message: "Price alerts checked",
        checked: activeAlerts.length,
        triggered: triggeredAlerts.length,
        triggeredSymbols: triggeredAlerts.map((a) => a.symbol),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[CHECK-PRICE-ALERTS] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
