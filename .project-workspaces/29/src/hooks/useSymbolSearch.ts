import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SymbolResult {
  symbol: string;
  name: string;
  asset_class: 'equity' | 'forex' | 'crypto' | 'options';
  exchange: string;
  base_currency?: string;
  quote_currency?: string;
  quote_type?: string;
}

export function useSymbolSearch() {
  const [results, setResults] = useState<SymbolResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (query: string, assetClass: string = 'all') => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || publicKey;

        const response = await fetch(
          `${supabaseUrl}/functions/v1/symbol-search?q=${encodeURIComponent(query)}&asset_class=${assetClass}`,
          {
            headers: {
              Accept: 'application/json',
              apikey: publicKey,
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Symbol search error:', err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, isSearching, search, clearResults };
}
