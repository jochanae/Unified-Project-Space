import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Home, MessageSquare, Loader2, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { captureError, addBreadcrumb } from "@/lib/sentry";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isDebugOpen: boolean;
  isReporting: boolean;
  reported: boolean;
  copied: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isDebugOpen: false,
    isReporting: false,
    reported: false,
    copied: false,
  };

  private handleCopy = async () => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message ?? "Unknown error"}`,
      "",
      `Stack:`,
      error?.stack ?? "(no stack)",
      "",
      `Component Stack:`,
      errorInfo?.componentStack ?? "(no component stack)",
      "",
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    
    // Report to Sentry
    addBreadcrumb("error_boundary", "Error caught by ErrorBoundary", {
      componentStack: errorInfo.componentStack,
    });
    
    captureError(error, {
      componentStack: errorInfo.componentStack,
      pageUrl: window.location.href,
    });
  }

  private handleReturnHome = () => {
    window.location.href = "/";
  };

  private handleReport = async () => {
    const { error, errorInfo } = this.state;
    
    this.setState({ isReporting: true });
    
    try {
      // Get current user — required to persist bug reports (RLS hardening)
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Anonymous users cannot persist bug reports; fall back to email below
        throw new Error("Not authenticated — cannot save bug report");
      }

      // Save bug report to database
      const { error: dbError } = await supabase.from("bug_reports").insert({
        user_id: user.id,
        error_message: error?.message || "Unknown error",
        error_stack: error?.stack || null,
        component_stack: errorInfo?.componentStack || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        status: "open",
      });

      if (dbError) throw dbError;
      
      this.setState({ reported: true });
    } catch (err) {
      console.error("Failed to submit bug report:", err);
      // Fallback to email
      const errorDetails = encodeURIComponent(
        `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`
      );
      window.location.href = `mailto:support@coinsbloom.com?subject=Bug Report&body=${errorDetails}`;
    } finally {
      this.setState({ isReporting: false });
    }
  };

  private toggleDebug = () => {
    this.setState((prev) => ({ isDebugOpen: !prev.isDebugOpen }));
  };

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo, isDebugOpen, isReporting, reported, copied } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg border-destructive/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl font-semibold text-foreground">
                Something went wrong
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                An unexpected error occurred. We apologize for the inconvenience.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Debug Info Collapsible */}
              <Collapsible open={isDebugOpen} onOpenChange={this.toggleDebug}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    size="sm"
                  >
                    <span>Debug Information</span>
                    {isDebugOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="flex justify-end mb-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-2 h-7 text-xs"
                      onClick={this.handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy details
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-48 select-text">
                    <p className="text-destructive font-semibold mb-2">
                      {error?.message}
                    </p>
                    {error?.stack && (
                      <pre className="text-muted-foreground whitespace-pre-wrap break-words">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo?.componentStack && (
                      <>
                        <p className="text-foreground font-semibold mt-3 mb-1">
                          Component Stack:
                        </p>
                        <pre className="text-muted-foreground whitespace-pre-wrap break-words">
                          {errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleReturnHome}
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <Home className="h-4 w-4" />
                  Return Home
                </Button>
                <Button
                  onClick={this.handleReport}
                  className="flex-1 gap-2"
                  variant="outline"
                  disabled={isReporting || reported}
                >
                  {isReporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reporting...
                    </>
                  ) : reported ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Reported
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      Report Issue
                    </>
                  )}
                </Button>
              </div>
              
              {reported && (
                <p className="text-xs text-center text-emerald-600">
                  Thank you! Your report has been submitted and will be reviewed.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
