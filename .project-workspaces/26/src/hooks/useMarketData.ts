import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currency?: string;
  exchangeName?: string;
  timestamp: Date;
}

interface QuoteCache {
  [symbol: string]: { quote: StockQuote; fetchedAt: number };
}

const CACHE_DURATION = 60_000; // 1 min

const getQuoteApiBase = () => {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/market-data`;
};

export function useMarketData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<QuoteCache>({});

  const fetchQuote = useCallback(
    async (symbol: string): Promise<StockQuote | null> => {
      const upper = symbol.toUpperCase().trim();
      const cached = cache[upper];
      if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
        return cached.quote;
      }

      setLoading(true);
      setError(null);
      try {
        const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const authToken = session?.access_token || publicKey;
        const res = await fetch(
          `${getQuoteApiBase()}?symbol=${encodeURIComponent(upper)}&type=quote`,
          {
            headers: {
              Accept: "application/json",
              apikey: publicKey,
              Authorization: `Bearer ${authToken}`,
            },
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch quote");
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const quote: StockQuote = {
          symbol: upper,
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.changePercent || 0,
          high: data.high || 0,
          low: data.low || 0,
          open: data.open || 0,
          previousClose: data.previousClose || 0,
          volume: data.volume || 0,
          fiftyTwoWeekHigh: data.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: data.fiftyTwoWeekLow ?? null,
          currency: data.currency,
          exchangeName: data.exchangeName,
          timestamp: new Date(data.timestamp || Date.now()),
        };

        setCache((prev) => ({
          ...prev,
          [upper]: { quote, fetchedAt: Date.now() },
        }));
        return quote;
      } catch (err) {
        console.error("market-data error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch quote");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cache],
  );

  const fetchMultipleQuotes = useCallback(
    async (symbols: string[]) => {
      const results = new Map<string, StockQuote>();
      await Promise.all(
        symbols.map(async (s) => {
          const q = await fetchQuote(s);
          if (q) results.set(s.toUpperCase(), q);
        }),
      );
      return results;
    },
    [fetchQuote],
  );

  return { fetchQuote, fetchMultipleQuotes, loading, error };
}

// Curated: indexes + ETFs only (compliance-aligned with Bloom's market lens).
export const popularSymbols = [
  { symbol: "SPY",  name: "S&P 500 ETF" },
  { symbol: "QQQ",  name: "Nasdaq 100 ETF" },
  { symbol: "DIA",  name: "Dow Jones ETF" },
  { symbol: "IWM",  name: "Russell 2000 ETF" },
  { symbol: "VTI",  name: "Total US Market" },
  { symbol: "VOO",  name: "Vanguard S&P 500" },
  { symbol: "XLK",  name: "Technology Sector" },
  { symbol: "XLF",  name: "Financials Sector" },
  { symbol: "XLE",  name: "Energy Sector" },
  { symbol: "GLD",  name: "Gold" },
  { symbol: "TLT",  name: "20+ Yr Treasuries" },
  { symbol: "VIX",  name: "Volatility Index" },
];
