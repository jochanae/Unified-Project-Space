import { supabase } from '@/integrations/supabase/client';

let isInitialized = false;

/**
 * Logs a client error to the database.
 * Debounces duplicate messages within 5s to avoid spam.
 */
const recentErrors = new Map<string, number>();

export async function logClientError(
  message: string,
  opts?: { stack?: string; component?: string },
) {
  const key = message.slice(0, 120);
  const now = Date.now();
  if (recentErrors.has(key) && now - recentErrors.get(key)! < 5000) return;
  recentErrors.set(key, now);

  // Prune old entries
  if (recentErrors.size > 50) {
    for (const [k, t] of recentErrors) {
      if (now - t > 10000) recentErrors.delete(k);
    }
  }

  try {
    await supabase.from('client_errors').insert({
      error_message: message.slice(0, 2000),
      error_stack: opts?.stack?.slice(0, 4000) || null,
      component_name: opts?.component || null,
      url: window.location.href,
      user_agent: navigator.userAgent,
      user_id: (await supabase.auth.getUser()).data?.user?.id || null,
    });
  } catch {
    // Silent
  }
}

/**
 * Install global listeners for unhandled errors and rejected promises.
 * Call once at app startup.
 */
export function initGlobalErrorCapture() {
  if (isInitialized) return;
  isInitialized = true;

  window.addEventListener('error', (event) => {
    logClientError(event.message || 'Unhandled error', {
      stack: event.error?.stack,
      component: event.filename ? `${event.filename}:${event.lineno}` : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : JSON.stringify(reason)?.slice(0, 500) || 'Unhandled promise rejection';

    logClientError(message, {
      stack: reason instanceof Error ? reason.stack : undefined,
      component: 'unhandledrejection',
    });
  });
}
