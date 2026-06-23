import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGhostText(input: string, debounceMs = 800) {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear on empty or short input
    if (input.trim().length < 10) {
      setSuggestion('');
      return;
    }

    // Debounce
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-ghost-text', {
          body: { input: input.trim() },
        });

        if (controller.signal.aborted) return;
        if (error || data?.error) {
          setSuggestion('');
          return;
        }
        setSuggestion(data?.suggestion || '');
      } catch {
        if (!controller.signal.aborted) setSuggestion('');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [input, debounceMs]);

  const accept = () => {
    const full = input + suggestion;
    setSuggestion('');
    return full;
  };

  const dismiss = () => setSuggestion('');

  return { suggestion, loading, accept, dismiss };
}
