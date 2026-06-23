import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState("submitting");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data.success || data.reason === "already_unsubscribed") setState("done");
      else setState("error");
    } catch {
      setState("error");
    }
  };

  return (
    <main
      className="min-h-screen bg-background flex items-center justify-center p-6"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }}
    >
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border/50">
        <h1 className="font-heading text-3xl text-foreground mb-2">Email preferences</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Manage your IntoIQ communication settings.
        </p>

        {state === "loading" && (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        )}

        {state === "valid" && (
          <>
            <p className="text-foreground mb-6">
              Confirm you'd like to unsubscribe from IntoIQ emails. You can resubscribe by signing up again.
            </p>
            <Button onClick={confirm} className="w-full" variant="destructive">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state === "submitting" && (
          <div className="flex justify-center py-6"><LoadingSpinner /></div>
        )}

        {state === "done" && (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
            <p className="text-foreground font-medium">You're unsubscribed</p>
            <p className="text-sm text-muted-foreground mt-2">
              We won't send you any more emails from this address.
            </p>
          </div>
        )}

        {state === "already" && (
          <div className="text-center py-4">
            <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-foreground font-medium">Already unsubscribed</p>
            <p className="text-sm text-muted-foreground mt-2">
              This email address is already opted out.
            </p>
          </div>
        )}

        {(state === "invalid" || state === "error") && (
          <div className="text-center py-4">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <p className="text-foreground font-medium">
              {state === "invalid" ? "Invalid or expired link" : "Something went wrong"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try the link again from your most recent email.
            </p>
          </div>
        )}
      </Card>
    </main>
  );
}
