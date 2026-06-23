import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { logClientError } from "@/lib/admin.functions";

type State = { error: Error | null };

/**
 * ReaderErrorBoundary — catches render-time errors inside the Reader tree
 * (e.g. infinite update loops, lazy-load failures) so the rest of the shell
 * keeps working and the user gets an actionable recovery path instead of a
 * white screen.
 */
export class ReaderErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void logClientError({
      data: {
        message: error.message,
        source: "reader-boundary",
        route: typeof window !== "undefined" ? window.location.pathname : "/reader",
        stackTrace: `${error.stack ?? ""}\n\nComponent stack:${info.componentStack ?? ""}`,
      },
    }).catch(() => undefined);
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="max-w-md space-y-2">
          <p className="font-display text-xs uppercase tracking-[0.32em] text-gold/70">
            Reader paused
          </p>
          <h1 className="font-display text-2xl text-foreground">Something interrupted the page.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The reader hit an unexpected error and was stopped to keep your place safe. Try
            reloading the chapter, or visit{" "}
            <Link to="/reader-diagnostics" className="text-gold underline underline-offset-2">
              reader diagnostics
            </Link>{" "}
            to capture details.
          </p>
        </div>
        <pre className="max-h-40 w-full max-w-md overflow-auto rounded-md border border-destructive/30 bg-muted/40 p-3 text-left font-mono text-[11px] leading-relaxed text-destructive">
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
