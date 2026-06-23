import { supabase } from '@/integrations/supabase/client';

let reportQueue: Array<{
  error_message: string;
  error_stack?: string;
  component_name?: string;
  url?: string;
}> = [];

let flushTimeout: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (reportQueue.length === 0) return;
  
  const batch = reportQueue.splice(0, 10); // max 10 at a time
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't log anonymous errors
    
    const rows = batch.map(e => ({
      user_id: user.id,
      error_message: e.error_message.slice(0, 2000),
      error_stack: e.error_stack?.slice(0, 5000) || null,
      component_name: e.component_name?.slice(0, 100) || null,
      url: e.url || window.location.pathname,
      user_agent: navigator.userAgent.slice(0, 500),
    }));
    
    await supabase.from('client_errors').insert(rows);
  } catch {
    // Silently fail — don't create error loops
  }
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flush();
  }, 5000); // Batch errors, flush every 5s
}

export function reportError(error: Error, componentName?: string) {
  // Deduplicate — don't log the same error message repeatedly
  if (reportQueue.some(e => e.error_message === error.message)) return;
  
  reportQueue.push({
    error_message: error.message,
    error_stack: error.stack,
    component_name: componentName,
    url: window.location.pathname,
  });
  
  scheduleFlush();
}

// Global unhandled error listener
export function initGlobalErrorReporter() {
  window.addEventListener('error', (event) => {
    reportError(new Error(event.message), 'window.onerror');
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason);
    reportError(new Error(message), 'unhandledrejection');
  });
}
