import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  timestamp: Date;
}

interface QuoteCache {
  [symbol: string]: {
    quote: StockQuote;
    fetchedAt: number;
  };
}

const CACHE_DURATION = 60000; // 1 minute cache

// Using backend proxy to avoid CORS issues
const getQuoteApiBase = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/market-data`;
};

export function useMarketData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<QuoteCache>({});

  const fetchQuote = useCallback(async (symbol: string): Promise<StockQuote | null> => {
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Check cache first
    const cached = cache[upperSymbol];
    if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
      return cached.quote;
    }

    setLoading(true);
    setError(null);

    try {
      // Use backend proxy to avoid CORS issues
      const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || publicKey;
      const response = await fetch(
        `${getQuoteApiBase()}?symbol=${encodeURIComponent(upperSymbol)}&type=quote`,
        {
          headers: {
            Accept: 'application/json',
            apikey: publicKey,
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch quote');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const stockQuote: StockQuote = {
        symbol: upperSymbol,
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        high: data.high || 0,
        low: data.low || 0,
        open: data.open || 0,
        previousClose: data.previousClose || 0,
        volume: data.volume || 0,
        timestamp: new Date(data.timestamp || Date.now()),
      };

      // Update cache
      setCache(prev => ({
        ...prev,
        [upperSymbol]: {
          quote: stockQuote,
          fetchedAt: Date.now(),
        },
      }));

      setLoading(false);
      return stockQuote;
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      setLoading(false);
      return null;
    }
  }, [cache]);

  const fetchMultipleQuotes = useCallback(async (symbols: string[]): Promise<Map<string, StockQuote>> => {
    const results = new Map<string, StockQuote>();
    
    // Fetch all quotes in parallel
    const promises = symbols.map(async (symbol) => {
      const quote = await fetchQuote(symbol);
      if (quote) {
        results.set(symbol.toUpperCase(), quote);
      }
    });

    await Promise.all(promises);
    return results;
  }, [fetchQuote]);

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  return {
    fetchQuote,
    fetchMultipleQuotes,
    clearCache,
    loading,
    error,
  };
}

// Popular stocks for quick lookup
export const popularSymbols = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'META', name: 'Meta' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Nasdaq ETF' },
];
