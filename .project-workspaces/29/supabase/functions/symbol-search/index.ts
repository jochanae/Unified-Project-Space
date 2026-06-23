import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common forex pairs
const FOREX_PAIRS = [
  { symbol: "EURUSD=X", name: "EUR/USD", base: "EUR", quote: "USD" },
  { symbol: "GBPUSD=X", name: "GBP/USD", base: "GBP", quote: "USD" },
  { symbol: "USDJPY=X", name: "USD/JPY", base: "USD", quote: "JPY" },
  { symbol: "AUDUSD=X", name: "AUD/USD", base: "AUD", quote: "USD" },
  { symbol: "USDCAD=X", name: "USD/CAD", base: "USD", quote: "CAD" },
  { symbol: "USDCHF=X", name: "USD/CHF", base: "USD", quote: "CHF" },
  { symbol: "NZDUSD=X", name: "NZD/USD", base: "NZD", quote: "USD" },
  { symbol: "EURGBP=X", name: "EUR/GBP", base: "EUR", quote: "GBP" },
  { symbol: "EURJPY=X", name: "EUR/JPY", base: "EUR", quote: "JPY" },
  { symbol: "GBPJPY=X", name: "GBP/JPY", base: "GBP", quote: "JPY" },
];

// Common crypto symbols
const CRYPTO_SYMBOLS = [
  { symbol: "BTC-USD", name: "Bitcoin", asset_class: "crypto" },
  { symbol: "ETH-USD", name: "Ethereum", asset_class: "crypto" },
  { symbol: "SOL-USD", name: "Solana", asset_class: "crypto" },
  { symbol: "XRP-USD", name: "Ripple", asset_class: "crypto" },
  { symbol: "ADA-USD", name: "Cardano", asset_class: "crypto" },
  { symbol: "DOGE-USD", name: "Dogecoin", asset_class: "crypto" },
  { symbol: "DOT-USD", name: "Polkadot", asset_class: "crypto" },
  { symbol: "AVAX-USD", name: "Avalanche", asset_class: "crypto" },
  { symbol: "MATIC-USD", name: "Polygon", asset_class: "crypto" },
  { symbol: "LINK-USD", name: "Chainlink", asset_class: "crypto" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("q")?.trim() || "";
    const assetClass = url.searchParams.get("asset_class") || "all"; // all, equity, forex, crypto

    if (!query || query.length < 1) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate query - allow alphanumeric, spaces, dots, hyphens, slashes
    if (!/^[A-Za-z0-9.\-/ ]{1,30}$/.test(query)) {
      return new Response(
        JSON.stringify({ error: "Invalid search query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upperQuery = query.toUpperCase();
    const results: any[] = [];

    // Search forex pairs locally
    if (assetClass === "all" || assetClass === "forex") {
      const forexMatches = FOREX_PAIRS.filter(
        (p) => p.name.toUpperCase().includes(upperQuery) || p.symbol.includes(upperQuery) || p.base.includes(upperQuery) || p.quote.includes(upperQuery)
      ).map((p) => ({
        symbol: p.symbol,
        name: p.name,
        asset_class: "forex",
        exchange: "Forex",
        base_currency: p.base,
        quote_currency: p.quote,
      }));
      results.push(...forexMatches);
    }

    // Search crypto locally
    if (assetClass === "all" || assetClass === "crypto") {
      const cryptoMatches = CRYPTO_SYMBOLS.filter(
        (c) => c.name.toUpperCase().includes(upperQuery) || c.symbol.toUpperCase().includes(upperQuery)
      ).map((c) => ({
        symbol: c.symbol,
        name: c.name,
        asset_class: "crypto",
        exchange: "Crypto",
      }));
      results.push(...cryptoMatches);
    }

    // Search equities via Yahoo Finance
    if (assetClass === "all" || assetClass === "equity") {
      try {
        const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=false`;
        const response = await fetch(yahooUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const quotes = data.quotes || [];
          
          for (const q of quotes) {
            // Skip if it looks like forex/crypto we already matched
            if (q.quoteType === "CURRENCY" || q.quoteType === "CRYPTOCURRENCY") continue;
            
            const isOption = q.quoteType === "OPTION";
            results.push({
              symbol: q.symbol,
              name: q.shortname || q.longname || q.symbol,
              asset_class: isOption ? "options" : "equity",
              exchange: q.exchDisp || q.exchange || "Unknown",
              quote_type: q.quoteType,
            });
          }
        }
      } catch (e) {
        console.error("Yahoo search error:", e);
        // Fall through - return local results only
      }
    }

    return new Response(
      JSON.stringify({ results: results.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Symbol search error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
