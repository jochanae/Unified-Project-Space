import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export const initSentry = () => {
  if (!SENTRY_DSN) {
    console.log("Sentry DSN not configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Set environment based on hostname
    environment: window.location.hostname.includes("localhost") 
      ? "development" 
      : "production",
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Capture 10% of all sessions for replay
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust this value in production
    tracesSampleRate: 0.1,
    
    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Ignore certain common non-actionable errors
      if (error instanceof Error) {
        // Ignore network errors that are expected
        if (error.message.includes("Failed to fetch") && 
            error.message.includes("analytics")) {
          return null;
        }
        
        // Ignore extension-related errors
        if (error.message.includes("chrome-extension://") ||
            error.message.includes("moz-extension://")) {
          return null;
        }
      }
      
      return event;
    },
    
    // Set user context when available
    initialScope: {
      tags: {
        app: "coinsbloom",
      },
    },
  });
};

// Set user context after authentication
export const setSentryUser = (user: { id: string; email?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
};

// Clear user context on logout
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

// Capture custom error with context
export const captureError = (
  error: Error, 
  context?: Record<string, unknown>
) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext("additional_info", context);
    }
    Sentry.captureException(error);
  });
};

// Capture a message/event
export const captureMessage = (
  message: string, 
  level: Sentry.SeverityLevel = "info"
) => {
  Sentry.captureMessage(message, level);
};

// Add breadcrumb for debugging
export const addBreadcrumb = (
  category: string,
  message: string,
  data?: Record<string, unknown>
) => {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
  });
};

// Export Sentry for direct access if needed
export { Sentry };
