import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { UserPlus, AlertCircle, Loader2, Crown, Info } from "lucide-react";

interface LinkKidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const FREE_KID_LIMIT = 2;

export const LinkKidModal = ({ open, onOpenChange, onSuccess }: LinkKidModalProps) => {
  const { user } = useAuth();
  const { tier, subscribed } = useSubscription();
  const [username, setUsername] = useState("");
  const [relationship, setRelationship] = useState("parent");
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedKidsCount, setLinkedKidsCount] = useState(0);

  const isPremium = subscribed || tier === "premium" || tier === "family";

  // Fetch current linked kids count when modal opens
  useEffect(() => {
    if (open && user) {
      const fetchCount = async () => {
        const { count } = await supabase
          .from("family_links")
          .select("*", { count: "exact", head: true })
          .eq("parent_user_id", user.id)
          .eq("status", "active");
        setLinkedKidsCount(count || 0);
      };
      fetchCount();
    }
  }, [open, user]);

  const canAddMoreKids = isPremium || linkedKidsCount < FREE_KID_LIMIT;

  const handleSubmit = async () => {
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      setError("Please enter your child's username");
      return;
    }

    if (!user) {
      setError("You must be logged in");
      return;
    }

    // Check subscription limit
    if (!isPremium && linkedKidsCount >= FREE_KID_LIMIT) {
      setError(`Free accounts can link up to ${FREE_KID_LIMIT} kids. Upgrade to Premium for unlimited linking.`);
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      // Validate username via edge function
      const { data, error: fnError } = await supabase.functions.invoke('validate-kid-username', {
        body: { username: trimmedUsername }
      });

      if (fnError) {
        console.error('Function error:', fnError);
        setError("Failed to validate username. Please try again.");
        setIsLinking(false);
        return;
      }

      if (!data.found) {
        setError(data.error || "Username not found. Please check and try again.");
        setIsLinking(false);
        return;
      }

      // Check if already linked
      const { data: existingLink } = await supabase
        .from("family_links")
        .select("id")
        .eq("parent_user_id", user.id)
        .eq("kid_profile_id", data.kid.id)
        .maybeSingle();

      if (existingLink) {
        setError("You're already linked to this child.");
        setIsLinking(false);
        return;
      }

      // Create the family link
      const { error: linkError } = await supabase
        .from("family_links")
        .insert({
          parent_user_id: user.id,
          kid_profile_id: data.kid.id,
          relationship,
          status: "active",
          accepted_at: new Date().toISOString(),
          can_view_transactions: true,
          can_assign_chores: true,
          can_set_allowance: true,
          can_approve_spending: true,
        });

      if (linkError) throw linkError;

      toast.success(`Successfully linked to ${data.kid.display_name}!`);
      
      // Reset form state
      setUsername("");
      setError(null);
      setRelationship("parent");
      setIsLinking(false);
      
      // Close modal and refresh parent data
      onOpenChange(false);
      
      // Small delay to ensure DB is consistent, then refresh
      setTimeout(() => {
        onSuccess();
      }, 150);
      
      return;
    } catch (err: any) {
      console.error('Link error:', err);
      setError("Failed to link account. Please try again.");
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setUsername("");
    setError(null);
    setRelationship("parent");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Link Child Account
          </DialogTitle>
          {!isPremium && (
            <DialogDescription className="flex items-center gap-2 text-xs">
              <Info className="h-3 w-3" />
              Free plan: {linkedKidsCount}/{FREE_KID_LIMIT} kids linked
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Free tier limit warning */}
          {!isPremium && linkedKidsCount >= FREE_KID_LIMIT && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-sm border border-amber-500/20">
              <Crown className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Kid limit reached</p>
                <p className="text-xs opacity-80">Upgrade to Premium to link more kids.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Child's Username</Label>
            <Input
              placeholder="Paste username here"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={isLinking || !canAddMoreKids}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Your child's username can be found in their KidsBloom profile settings.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select value={relationship} onValueChange={setRelationship} disabled={isLinking || !canAddMoreKids}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="guardian">Guardian</SelectItem>
                <SelectItem value="grandparent">Grandparent</SelectItem>
                <SelectItem value="other">Other Family</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isLinking || !username.trim() || !canAddMoreKids}
            className="w-full"
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : !canAddMoreKids ? (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Link More
              </>
            ) : (
              "Link Account"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};