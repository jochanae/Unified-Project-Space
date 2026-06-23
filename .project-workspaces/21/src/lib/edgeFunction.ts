/**
 * Unified edge function client.
 * Handles auth headers, base URL, and error logging in one place.
 * Use this instead of raw fetch() for all Supabase edge function calls.
 *
 * Usage:
 *   const data = await callEdgeFunction('think-freely', { history });
 *   const data = await callEdgeFunction('get-voices', { gender: 'male' }, { useAnonKey: true });
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface CallOptions {
  /** Use anon/publishable key instead of user session token (for unauthenticated calls) */
  useAnonKey?: boolean;
  /** Skip throwing on non-ok response — return null instead */
  softFail?: boolean;
}

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  body?: Record<string, unknown>,
  options: CallOptions = {}
): Promise<T | null> {
  try {
    let token = ANON_KEY;

    if (!options.useAnonKey) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        token = session.access_token;
      }
    }

    const resp = await fetch(`${BASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      logger.warn(`[EdgeFunction] ${functionName} returned ${resp.status}:`, errText);
      if (options.softFail) return null;
      throw new Error(`Edge function ${functionName} failed: ${resp.status}`);
    }

    return await resp.json() as T;
  } catch (e) {
    logger.error(`[EdgeFunction] ${functionName} error:`, e);
    if (options.softFail) return null;
    throw e;
  }
}

/**
 * Fire-and-forget edge function call — errors are logged but never thrown.
 * Use for non-critical background tasks like extraction, notifications, analytics.
 */
export function fireEdgeFunction(
  functionName: string,
  body?: Record<string, unknown>,
  options: Omit<CallOptions, 'softFail'> = {}
): void {
  callEdgeFunction(functionName, body, { ...options, softFail: true }).catch(() => {});
}
