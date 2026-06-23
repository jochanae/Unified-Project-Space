import { createRouter, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { routeTree } from "./routeTree.gen";
import { logClientError } from "@/lib/admin.functions";

const IS_DEV = import.meta.env.DEV;

function DefaultErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const route = typeof window !== "undefined" ? window.location.pathname : "";
  const fullDetails = `${error.message}\n\nRoute: ${route}\n\n${error.stack ?? "No stack trace"}`;

  useEffect(() => {
    void logClientError({
      data: {
        message: error.message,
        source: "router-boundary",
        route,
        stackTrace: error.stack,
      },
    }).catch(() => undefined);
  }, [error, route]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (insecure context, denied permission, etc.)
      // Surface the error text via prompt so the developer can still copy it.
      window.prompt("Copy the error details below:", fullDetails);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10 sm:items-center">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {IS_DEV && error.message && (
          <div className="mt-4 overflow-hidden rounded-md border border-destructive/30 bg-muted text-left">
            <div className="flex items-center justify-between gap-2 border-b border-destructive/20 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Error details (dev only)
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent active:scale-95"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-destructive">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </div>
        )}
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
};
