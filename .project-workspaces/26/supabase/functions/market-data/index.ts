// Yahoo Finance proxy for live quotes + chart history.
// Ported from Old Quinn-standalone. No API key required.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol");
    const interval = url.searchParams.get("interval") || "1d";
    const range = url.searchParams.get("range") || "1mo";
    const type = url.searchParams.get("type") || "quote";

    if (!symbol) return json({ error: "Symbol is required" }, 400);
    const upper = symbol.toUpperCase().trim();
    if (!/^[A-Z0-9.\-^/=]{1,15}$/.test(upper)) {
      return json({ error: "Invalid symbol format" }, 400);
    }

    const validIntervals = [
      "1m","2m","5m","15m","30m","60m","90m","1h","1d","5d","1wk","1mo","3mo",
    ];
    const validRanges = [
      "1d","5d","1mo","3mo","6mo","1y","2y","5y","10y","ytd","max",
    ];
    if (!validIntervals.includes(interval)) return json({ error: "Invalid interval" }, 400);
    if (!validRanges.includes(range)) return json({ error: "Invalid range" }, 400);

    // Try Yahoo first (query1 -> query2 fallback). If both fail, fall back to Stooq for a basic quote.
    const yahooHosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
    let data: any = null;
    let lastStatus = 0;
    for (const host of yahooHosts) {
      const yahooUrl = `https://${host}/v8/finance/chart/${encodeURIComponent(upper)}?interval=${interval}&range=${range}`;
      try {
        const res = await fetch(yahooUrl, {
          headers: { Accept: "application/json", "User-Agent": UA },
        });
        lastStatus = res.status;
        if (res.ok) {
          data = await res.json();
          if (!data.chart?.error) break;
          data = null;
        }
      } catch (_) { /* try next host */ }
    }

    if (!data) {
      // Stooq fallback — quote only (no chart history). Sufficient for type=quote.
      const stooqRes = await fetch(
        `https://stooq.com/q/l/?s=${encodeURIComponent(upper.toLowerCase())}.us&f=sd2t2ohlcv&h&e=csv`,
        { headers: { "User-Agent": UA } },
      );
      if (stooqRes.ok) {
        const csv = (await stooqRes.text()).trim().split("\n");
        if (csv.length >= 2) {
          const [, d, , o, h, l, c, v] = csv[1].split(",");
          const close = parseFloat(c);
          const open = parseFloat(o);
          if (Number.isFinite(close) && close > 0) {
            return json({
              symbol: upper,
              price: close,
              change: close - open,
              changePercent: open > 0 ? ((close - open) / open) * 100 : 0,
              high: parseFloat(h) || 0,
              low: parseFloat(l) || 0,
              open: open || 0,
              previousClose: open || 0,
              volume: parseInt(v) || 0,
              fiftyTwoWeekHigh: null,
              fiftyTwoWeekLow: null,
              currency: "USD",
              exchangeName: "Stooq",
              timestamp: new Date().toISOString(),
              source: "stooq",
            });
          }
        }
      }
      return json({ error: "Failed to fetch market data", status: lastStatus || 502 }, 502);
    }

    if (data.chart?.error) {
      return json({ error: data.chart.error.description || "Symbol not found" }, 404);
    }
    const result = data.chart?.result?.[0];
    if (!result) return json({ error: "No data available for this symbol" }, 404);

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    if (type === "quote") {
      return json({
        symbol: upper,
        price: meta.regularMarketPrice ?? 0,
        change:
          (meta.regularMarketPrice ?? 0) - (meta.previousClose ?? 0),
        changePercent:
          meta.regularMarketPrice && meta.previousClose
            ? ((meta.regularMarketPrice - meta.previousClose) /
                meta.previousClose) *
              100
            : 0,
        high: meta.regularMarketDayHigh ?? quote?.high?.[0] ?? 0,
        low: meta.regularMarketDayLow ?? quote?.low?.[0] ?? 0,
        open: meta.regularMarketOpen ?? quote?.open?.[0] ?? 0,
        previousClose: meta.previousClose ?? 0,
        volume: meta.regularMarketVolume ?? quote?.volume?.[0] ?? 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        currency: meta.currency,
        exchangeName: meta.exchangeName,
        timestamp: new Date().toISOString(),
      });
    }

    const chart = timestamps
      .map((ts: number, i: number) => ({
        timestamp: ts,
        open: quote.open?.[i] ?? 0,
        high: quote.high?.[i] ?? 0,
        low: quote.low?.[i] ?? 0,
        close: quote.close?.[i] ?? 0,
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter((d: any) => d.open > 0 && d.close > 0);

    return json({
      symbol: upper,
      meta: {
        currency: meta.currency,
        exchangeName: meta.exchangeName,
        regularMarketPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
      },
      data: chart,
    });
  } catch (err) {
    console.error("market-data error", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
