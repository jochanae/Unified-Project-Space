import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleAuthCallback = async () => {
      try {
        // Parse URL for any errors from the OAuth provider
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);

        const error = url.searchParams.get("error") ?? hashParams.get("error");
        const errorDescription = url.searchParams.get("error_description") ?? hashParams.get("error_description");

        if (error) {
          setStatus("error");
          setMessage(errorDescription || error);
          return;
        }

        // Clean URL immediately to prevent re-use
        try {
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        } catch {
          // ignore
        }

        // Check for existing session first - this handles the case where
        // Supabase already exchanged the code via the auth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setStatus("error");
          setMessage(sessionError.message);
          return;
        }

        if (session) {
          if (cancelled) return;
          
          setStatus("success");
          toast({
            title: "✓ Signed in",
            description: "Taking you to your dashboard…",
          });
          navigate("/dashboard", { replace: true });
          return;
        }

        // If no session found yet, wait a moment and check again
        // Sometimes the session takes a moment to be available after redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        
        if (retrySession) {
          if (cancelled) return;
          
          setStatus("success");
          toast({
            title: "✓ Signed in",
            description: "Taking you to your dashboard…",
          });
          navigate("/dashboard", { replace: true });
          return;
        }

        // Still no session - something went wrong
        setStatus("error");
        setMessage("Could not complete sign-in. Please try again.");
        
      } catch (err: any) {
        if (cancelled) return;
        
        console.error("Auth callback error:", err);
        setStatus("error");
        setMessage(err?.message || "Could not complete sign-in. Please try again.");
      }
    };

    // Give Supabase client a moment to process the callback
    const timer = setTimeout(handleAuthCallback, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [toast, navigate]);

  return (
    <>
      <Helmet>
        <title>Signing you in | CoinsBloom</title>
        <meta name="description" content="Completing secure sign-in for CoinsBloom." />
      </Helmet>

      <main className="min-h-screen flex items-center justify-center p-6">
        <section className="w-full max-w-md">
          <h1 className="sr-only">Sign-In Callback</h1>

          <Card>
            <CardHeader>
              <CardTitle>
                {status === "error" ? "Sign-in failed" : "Signing you in"}
              </CardTitle>
              <CardDescription>
                {status === "loading" && "Finishing secure sign-in…"}
                {status === "success" && "Redirecting…"}
                {status === "error" && "We could not complete sign-in."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {status === "loading" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="md" />
                    <span className="text-sm text-muted-foreground">Please wait.</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If this takes more than 10 seconds, try signing in again.
                  </p>
                </div>
              )}

              {status === "error" && (
                <>
                  {message && (
                    <p className="text-sm text-destructive break-words">{message}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => window.location.assign("/auth?mode=signin&start=google")}
                    >
                      Restart Google sign-in
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/auth?mode=signin", { replace: true })}
                    >
                      Back to sign in
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
