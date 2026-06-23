import { useEffect } from "react";
import { logClientError } from "@/lib/admin.functions";

type AdminErrorLoggerOptions = {
  enabled?: boolean;
  source: string;
  route: string;
};

export function useAdminErrorLogger({ enabled = true, source, route }: AdminErrorLoggerOptions) {
  useEffect(() => {
    // Production-only: avoid polluting the admin log with dev/preview noise.
    if (!enabled || !import.meta.env.PROD) return;

    const onError = (event: ErrorEvent) => {
      void logClientError({
        data: {
          message: event.message || "Unknown client error",
          source,
          route,
          stackTrace: event.error instanceof Error ? event.error.stack : undefined,
          metadata: {
            filename: event.filename,
            line: event.lineno,
            column: event.colno,
          },
        },
      }).catch(() => undefined);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      // Server-fn failures reject with a Response; don't log "[object Response]".
      if (reason instanceof Response) {
        event.preventDefault();
        return;
      }
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection");
      const stack = reason instanceof Error ? reason.stack : undefined;

      void logClientError({
        data: {
          message,
          source,
          route,
          stackTrace: stack,
          metadata: { kind: "unhandledrejection" },
        },
      }).catch(() => undefined);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [enabled, route, source]);
}
