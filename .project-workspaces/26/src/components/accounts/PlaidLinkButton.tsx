import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Landmark, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface PlaidLinkButtonProps {
  onSuccess: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle");
  const [linkedInstitution, setLinkedInstitution] = useState<string | null>(null);

  const createLinkToken = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to link your bank");
        return;
      }

      const response = await supabase.functions.invoke("plaid", {
        body: { action: "create_link_token" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.link_token) {
        setLinkToken(response.data.link_token);
        setShowModal(true);
        setStatus("idle");
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error creating link token:", error);
      toast.error("Failed to initialize bank connection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onPlaidSuccess = useCallback(async (publicToken: string) => {
    setStatus("linking");
    try {
      const response = await supabase.functions.invoke("plaid", {
        body: { action: "exchange_token", public_token: publicToken },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        setStatus("success");
        setLinkedInstitution(response.data.institution);
        toast.success(`Successfully linked ${response.data.accounts_linked} accounts from ${response.data.institution}`);
        setTimeout(() => {
          setShowModal(false);
          onSuccess();
        }, 2000);
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error("Error exchanging token:", error);
      setStatus("error");
      toast.error("Failed to link bank accounts. Please try again.");
    }
  }, [onSuccess]);

  const onPlaidExit = useCallback(() => {
    if (status === "idle") {
      setShowModal(false);
      setLinkToken(null);
    }
  }, [status]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: onPlaidExit,
  });

  const handleOpenPlaid = () => {
    if (ready && linkToken) {
      open();
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1">
        <Button
          variant="default"
          className="bg-orange-500 hover:bg-orange-600"
          onClick={createLinkToken}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Landmark className="h-4 w-4 mr-2" />
          )}
          Link Bank (Premium)
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Auto-sync + Smart Bill Detection
        </p>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Bank</DialogTitle>
            <DialogDescription>
              Securely connect your bank accounts using Plaid
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {status === "idle" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    We use Plaid to securely connect to your bank. Your credentials are never stored on our servers.
                  </p>
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 text-left">
                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">What you'll get:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>✓ Auto-sync account balances daily</li>
                      <li>✓ Import transactions automatically</li>
                      <li>✓ Smart Bill Detection from patterns</li>
                      <li>✓ Bank-level encryption & read-only</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleOpenPlaid}
                  disabled={!ready || !linkToken}
                >
                  {!ready ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Continue to Plaid
                </Button>
              </div>
            )}

            {status === "linking" && (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <p className="font-medium">Linking your accounts...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we securely connect your accounts.
                </p>
              </div>
            )}

            {status === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-medium text-green-600">Successfully Connected!</p>
                <p className="text-sm text-muted-foreground">
                  Your accounts from {linkedInstitution} have been linked.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="font-medium text-destructive">Connection Failed</p>
                <p className="text-sm text-muted-foreground">
                  There was an error connecting your bank. Please try again.
                </p>
                <Button variant="outline" onClick={() => setStatus("idle")}>
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
