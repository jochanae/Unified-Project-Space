import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent open proxy abuse
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
    const symbol = url.searchParams.get("symbol");
    const interval = url.searchParams.get("interval") || "1d";
    const range = url.searchParams.get("range") || "1mo";
    const type = url.searchParams.get("type") || "chart"; // "chart", "quote", or "options"
    const expirationDate = url.searchParams.get("expiration") || ""; // Unix timestamp for options

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upperSymbol = symbol.toUpperCase().trim();

    // Validate symbol format (1-10 alphanumeric chars, dots, hyphens, carets, slashes for forex)
    if (!/^[A-Z0-9.\-^/=]{1,15}$/.test(upperSymbol)) {
      return new Response(
        JSON.stringify({ error: "Invalid symbol format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle options chain request
    if (type === "options") {
      console.log(`Fetching options chain for ${upperSymbol} (user: ${user.id})`);

      // Yahoo Finance now requires crumb authentication for options API
      // Step 1: Get a session cookie from fc.yahoo.com
      let crumb = "";
      let cookieHeader = "";
      try {
        const cookieResp = await fetch("https://fc.yahoo.com", {
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        });
        const setCookies = cookieResp.headers.get("set-cookie") || "";
        cookieHeader = setCookies.split(",").map((c: string) => c.split(";")[0].trim()).join("; ");
        
        // Step 2: Get the crumb using the cookie
        const crumbResp = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Cookie": cookieHeader,
          },
        });
        if (crumbResp.ok) {
          crumb = await crumbResp.text();
        }
      } catch (e) {
        console.log("Failed to get Yahoo crumb:", e);
      }

      // Step 3: Fetch options with crumb auth
      const crumbParam = crumb ? `&crumb=${encodeURIComponent(crumb)}` : "";
      const dateParam = expirationDate ? `&date=${expirationDate}` : "";
      const optionsUrl = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(upperSymbol)}?${dateParam}${crumbParam}`.replace("?&", "?");

      const optionsResponse = await fetch(optionsUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
        },
      });

      if (!optionsResponse.ok) {
        console.log(`Options API returned ${optionsResponse.status}`);
        return new Response(
          JSON.stringify({ error: "Options data is temporarily unavailable. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const optionsData = await optionsResponse.json();
      const optionResult = optionsData.optionChain?.result?.[0];

      if (!optionResult) {
        return new Response(
          JSON.stringify({ error: "No options data available for this symbol" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expirationDates = optionResult.expirationDates || [];
      const strikes = optionResult.strikes || [];
      const quote = optionResult.quote || {};
      const options = optionResult.options?.[0] || {};

      const formatOption = (opt: any) => ({
        strike: opt.strike,
        lastPrice: opt.lastPrice,
        bid: opt.bid,
        ask: opt.ask,
        change: opt.change,
        percentChange: opt.percentChange,
        volume: opt.volume,
        openInterest: opt.openInterest,
        impliedVolatility: opt.impliedVolatility,
        inTheMoney: opt.inTheMoney,
        expiration: opt.expiration,
      });

      const responseData = {
        symbol: upperSymbol,
        underlyingPrice: quote.regularMarketPrice || 0,
        expirationDates,
        strikes,
        calls: (options.calls || []).map(formatOption),
        puts: (options.puts || []).map(formatOption),
      };

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate interval and range against allowed values
    const validIntervals = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"];
    const validRanges = ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
    if (!validIntervals.includes(interval)) {
      return new Response(
        JSON.stringify({ error: "Invalid interval" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!validRanges.includes(range)) {
      return new Response(
        JSON.stringify({ error: "Invalid range" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Yahoo Finance URL
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=${interval}&range=${range}`;
    
    console.log(`Fetching market data for ${upperSymbol} (user: ${user.id})`);

    const response = await fetch(yahooUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch market data", status: response.status }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    if (data.chart?.error) {
      return new Response(
        JSON.stringify({ error: data.chart.error.description || "Symbol not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data.chart?.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ error: "No data available for this symbol" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract and format the data
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    if (type === "quote") {
      const quoteData = {
        symbol: upperSymbol,
        price: meta.regularMarketPrice || 0,
        change: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
        changePercent: meta.regularMarketPrice && meta.previousClose 
          ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 
          : 0,
        high: meta.regularMarketDayHigh || quote?.high?.[0] || 0,
        low: meta.regularMarketDayLow || quote?.low?.[0] || 0,
        open: meta.regularMarketOpen || quote?.open?.[0] || 0,
        previousClose: meta.previousClose || 0,
        volume: meta.regularMarketVolume || quote?.volume?.[0] || 0,
        timestamp: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify(quoteData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return chart data
    const chartData = timestamps.map((ts: number, i: number) => ({
      timestamp: ts,
      open: quote.open?.[i] || 0,
      high: quote.high?.[i] || 0,
      low: quote.low?.[i] || 0,
      close: quote.close?.[i] || 0,
      volume: quote.volume?.[i] || 0,
    })).filter((d: any) => d.open > 0 && d.close > 0);

    const responseData = {
      symbol: upperSymbol,
      meta: {
        currency: meta.currency,
        exchangeName: meta.exchangeName,
        regularMarketPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose,
      },
      data: chartData,
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Market data proxy error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
