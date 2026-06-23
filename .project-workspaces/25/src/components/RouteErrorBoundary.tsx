import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { logClientError } from "@/lib/admin.functions";

type Props = { children: ReactNode; routeName?: string };
type State = { error: Error | null };

/**
 * Generic route-level error boundary.
 * Drop into any route's `errorComponent` or wrap a route component directly.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logClientError({
      data: {
        message: error.message,
        source: `route-boundary:${this.props.routeName ?? "unknown"}`,
        route: typeof window !== "undefined" ? window.location.pathname : "",
        stackTrace: `${error.stack ?? ""}\n\nComponent stack:${info.componentStack ?? ""}`,
      },
    }).catch(() => undefined);
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="font-display text-xs uppercase tracking-[0.32em] text-gold/70">
            Something went wrong
          </p>
          <h1 className="font-display text-2xl text-foreground">
            This page hit an unexpected error.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your data is safe. Try reloading, or head home if the problem continues.
          </p>
        </div>
        <pre className="max-h-32 w-full max-w-md overflow-auto rounded-md border border-destructive/30 bg-muted/40 p-3 text-left font-mono text-[11px] leading-relaxed text-destructive">
          {error.message}
        </pre>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-md bg-gold/90 px-4 py-2 text-sm font-medium text-obsidian transition-colors hover:bg-gold"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }
}

/**
 * Standalone errorComponent for use in createFileRoute config.
 */
export function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="max-w-md space-y-2">
        <p className="font-display text-xs uppercase tracking-[0.32em] text-gold/70">
          Something went wrong
        </p>
        <h1 className="font-display text-2xl text-foreground">
          This page hit an unexpected error.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your data is safe. Try reloading, or head home if the problem continues.
        </p>
      </div>
      <pre className="max-h-32 w-full max-w-md overflow-auto rounded-md border border-destructive/30 bg-muted/40 p-3 text-left font-mono text-[11px] leading-relaxed text-destructive">
        {error.message}
      </pre>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-gold/90 px-4 py-2 text-sm font-medium text-obsidian transition-colors hover:bg-gold"
        >
          Try again
        </button>
        <Link
          to="/"
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
