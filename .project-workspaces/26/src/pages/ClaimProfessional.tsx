import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BadgeCheck, AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function ClaimProfessional() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Stash token so post-login flow can return here
    if (token && !user) {
      sessionStorage.setItem("pending_claim_token", token);
    }
  }, [token, user]);

  const handleClaim = async () => {
    if (!token || !user) return;
    setClaiming(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("claim_professional_profile", {
        p_token: token,
      });
      if (rpcError) throw rpcError;
      sessionStorage.removeItem("pending_claim_token");
      setSuccess(true);
      toast.success("Profile claimed successfully");
      setTimeout(() => navigate(`/professionals/${data}`), 1200);
    } catch (err: any) {
      setError(err.message || "Failed to claim profile");
    } finally {
      setClaiming(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 grid place-items-center">
            <BadgeCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Claim your professional profile</CardTitle>
          <CardDescription>
            You've been invited to take ownership of a CoinsBloom professional listing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="text-center text-sm text-muted-foreground">
              <BadgeCheck className="h-8 w-8 mx-auto text-green-500 mb-2" />
              Profile claimed! Redirecting to your dashboard…
            </div>
          ) : !user ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account to continue. We'll bring you back here right after.
              </p>
              <Button asChild className="w-full">
                <Link to={`/auth?redirect=${encodeURIComponent(`/professionals/claim/${token}`)}`}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in to claim
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>.
                Click below to permanently link this profile to your account.
              </p>
              {error && (
                <div className="flex gap-2 items-start rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <Button onClick={handleClaim} disabled={claiming} className="w-full">
                {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Claim this profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
