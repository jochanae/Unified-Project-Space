import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'compani-letter-copy-cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CachedLetters {
  timestamp: number;
  data: Record<string, string>;
}

/** Fetch all letter_* keys from admin_settings with localStorage cache */
export function useLetterCopy() {
  const [letters, setLetters] = useState<Record<string, string>>(() => {
    try {
      const cached: CachedLetters = JSON.parse(localStorage.getItem(CACHE_KEY) || '');
      if (Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    } catch { /* no cache */ }
    return {};
  });

  useEffect(() => {
    supabase
      .from('admin_settings' as any)
      .select('key, value')
      .like('key', 'letter_%')
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const map: Record<string, string> = {};
        for (const row of data as any[]) {
          if (typeof row.value === 'string') map[row.key] = row.value;
        }
        if (Object.keys(map).length > 0) {
          setLetters(map);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: map }));
        }
      });
  }, []);

  return letters;
}

/** Resolve a letter template, replacing ${name} and ${companionLine} placeholders */
export function resolveLetterTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), val);
  }
  return result;
}
