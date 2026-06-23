import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      supabase.from('client_errors').insert({
        error_message: error.message,
        error_stack: error.stack || null,
        component_name: errorInfo?.componentStack || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Silent — don't cause another error
    }
  }

  handleCopyError = () => {
    const { error } = this.state;
    if (!error) return;
    const text = `${error.message}\n\n${error.stack || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Error copied');
    });
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ background: '#070b10' }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 35, 0.95)',
              border: '1px solid rgba(56, 189, 179, 0.2)',
              backdropFilter: 'blur(24px)',
              borderRadius: '1rem',
              maxWidth: '28rem',
              width: '100%',
              padding: '2rem',
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <span
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#e8f0f8',
                  letterSpacing: '-0.02em',
                }}
              >
                Into<span style={{ color: 'hsl(174, 72%, 50%)', fontStyle: 'italic' }}>IQ</span>
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '1.25rem',
                color: '#e8f0f8',
                textAlign: 'center',
                marginBottom: '0.5rem',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'rgba(232, 240, 248, 0.5)',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              An unexpected error occurred. You can copy the details, retry, or head back to the dashboard.
            </p>

            {/* Error block */}
            <pre
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(56, 189, 179, 0.15)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.7rem',
                color: 'rgba(232, 240, 248, 0.7)',
                fontFamily: 'monospace',
                maxHeight: '10rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginBottom: '1.25rem',
              }}
            >
              {this.state.error.message}
              {this.state.error.stack && (
                <>
                  {'\n\n'}
                  {this.state.error.stack}
                </>
              )}
            </pre>

            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'hsl(174, 72%, 50%)',
                  color: '#070b10',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px hsla(174, 72%, 50%, 0.3)',
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoToDashboard}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(56, 189, 179, 0.3)',
                  background: 'transparent',
                  color: '#e8f0f8',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Go to Dashboard
              </button>
              <button
                onClick={this.handleCopyError}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(232, 240, 248, 0.1)',
                  background: 'transparent',
                  color: 'rgba(232, 240, 248, 0.6)',
                  fontWeight: 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
              >
                Copy Error
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-2xl border border-border/30 p-4 text-xs text-muted-foreground text-center">
          This section could not load.
        </div>
      );
    }
    return this.props.children;
  }
}
