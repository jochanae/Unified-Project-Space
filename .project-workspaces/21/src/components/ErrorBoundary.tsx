import React, { Component, type ReactNode } from 'react';
import { captureError } from '@/lib/sentry';
import { reportError } from '@/lib/errorReporter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function CopyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <button
        onClick={() => navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))}
        className="flex items-center gap-1 text-xs font-semibold text-destructive mb-1 hover:text-primary transition-colors cursor-pointer"
      >
        {label} <span className="text-[10px] text-muted-foreground font-normal">(tap to copy)</span>
      </button>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
}

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  reportSent: boolean;
  showDebug: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null, reportSent: false, showDebug: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const componentStack = info.componentStack || null;
    this.setState({ componentStack });
    console.error('[ErrorBoundary] Caught error:', error, componentStack);
    reportError(error, this.props.name || 'ErrorBoundary');
    captureError(error, { component: this.props.name, componentStack });
  }

  handleReportIssue = async () => {
    const { error, componentStack } = this.state;
    if (this.state.reportSent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('bug_reports').insert({
        user_id: user?.id || null,
        error_message: (error?.message || 'Unknown error').slice(0, 2000),
        error_stack: (error?.stack || '').slice(0, 5000),
        component_stack: (componentStack || '').slice(0, 5000),
        page_url: window.location.href,
        user_agent: navigator.userAgent.slice(0, 500),
      });
      this.setState({ reportSent: true });
    } catch {
      // Silently fail
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, componentStack, reportSent, showDebug } = this.state;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <div className="mb-4 text-5xl">😔</div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. You can try going home or report this issue so we can fix it.
          </p>

          <div className="flex gap-3 mb-4">
            <a
              href="/"
              className="rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Return Home
            </a>
            <button
              onClick={this.handleReportIssue}
              disabled={reportSent}
              className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {reportSent ? '✓ Reported' : 'Report Issue'}
            </button>
          </div>

          {import.meta.env.DEV && (
            <>
              <button
                onClick={() => this.setState({ showDebug: !showDebug })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                {showDebug ? 'Hide' : 'Show'} debug info
              </button>

              {showDebug && (
                <div className="mt-3 w-full max-w-lg text-left rounded-lg border border-border bg-card p-4 overflow-auto max-h-64 space-y-3">
                  <CopyBlock label="Error" text={error?.message ?? 'Unknown error'} />
                  {error?.stack && <CopyBlock label="Stack" text={error.stack} />}
                  {componentStack && <CopyBlock label="Component Stack" text={componentStack} />}
                  <button
                    onClick={() => {
                      const full = `Error: ${error?.message}\n\nStack: ${error?.stack || 'N/A'}\n\nComponent Stack: ${componentStack || 'N/A'}`;
                      navigator.clipboard.writeText(full).then(() => toast.success('Full debug info copied'));
                    }}
                    className="w-full text-[10px] font-medium text-primary hover:text-primary/80 transition-colors py-1 border border-border rounded-md"
                  >
                    📋 Copy All
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
