import * as Sentry from '@sentry/react';
import { logger } from '@/utils/logger';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    logger.warn('[Sentry] No DSN configured — skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.3,
    environment: import.meta.env.MODE,
    initialScope: {
      tags: { project: 'mycompani' },
    },
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || '';
      const frames = event.exception?.values?.[0]?.stacktrace?.frames || [];

      // Filter browser extensions
      if (msg.includes('chrome-extension://') || msg.includes('moz-extension://')) return null;
      if (frames.some(f => f.filename?.includes('chrome-extension://') || f.filename?.includes('moz-extension://'))) return null;

      // Filter common transient/harmless errors
      if (msg.includes('ResizeObserver loop')) return null;
      if (msg.includes('Network request failed')) return null;
      if (msg.includes('Failed to fetch') || msg.includes('Load failed')) return null;
      if (msg.includes('AbortError')) return null;
      if (msg.includes('TypeError: cancelled') || msg.includes('TypeError: Cancelled')) return null;
      if (msg.includes('NotAllowedError')) return null;
      if (msg.includes('ChunkLoadError') || msg.includes('Loading chunk')) return null;
      if (msg.includes('analytics') && msg.includes('fetch')) return null;
      if (msg.includes('Non-Error promise rejection')) return null;
      if (msg.includes('Permission denied') && msg.includes('clipboard')) return null;
      if (msg.includes('play() request was interrupted')) return null;
      if (msg.includes('Navigator LockManager')) return null;
      if (msg.includes('NotSupportedError')) return null;
      if (msg.includes('InvalidStateError')) return null;
      if (msg.includes('Failed to start the audio')) return null;
      if (msg.includes('Target container is not a DOM element')) return null;

      return event;
    },
  });
}

export function setSentryUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}
