import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserPremiumToggleProps {
  userId: string;
  isPremium: boolean;
  adminId: string;
  onToggle: (userId: string, newState: boolean) => void;
}

export function UserPremiumToggle({ userId, isPremium, adminId, onToggle }: UserPremiumToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (!isPremium) {
        // Grant premium
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan: "premium",
            status: "active",
            granted_by: adminId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (error) throw error;
        toast.success("Premium granted");
        onToggle(userId, true);
      } else {
        // Revoke premium
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan: "free",
            status: "canceled",
            granted_by: adminId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (error) throw error;
        toast.success("Premium revoked");
        onToggle(userId, false);
      }
    } catch (error: any) {
      console.error("Toggle premium error:", error);
      toast.error("Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isPremium}
        onCheckedChange={handleToggle}
        disabled={loading}
        className="data-[state=checked]:bg-amber-500"
      />
      <span className="text-xs text-white/50">
        {isPremium ? "Premium" : "Free"}
      </span>
    </div>
  );
}
