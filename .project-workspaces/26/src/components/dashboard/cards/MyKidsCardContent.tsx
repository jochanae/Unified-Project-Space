import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Smile, Users, Plus, CheckCircle, Clock, DollarSign, Heart, PiggyBank, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AvatarStack from "@/components/goals/AvatarStack";
import { FamilyOnboardingModal } from "@/components/family/FamilyOnboardingModal";

interface LinkedKid {
  id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_url?: string | null;
  current_balance: number;
  pendingChores: number;
}

export const MyKidsCardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [linkedKids, setLinkedKids] = useState<LinkedKid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLinkedKids();
    }
  }, [user]);

  const fetchLinkedKids = async () => {
    try {
      const parentId = user?.id;
      if (!parentId) return;

      // Use a backend function (security definer) to fetch linked kids reliably.
      // This avoids brittle nested selects that can fail silently under RLS.
      const { data: kids, error: kidsError } = await supabase.rpc("get_linked_kids_profiles", {
        p_parent_id: parentId,
      });

      if (kidsError) throw kidsError;

      const kidsWithChores = await Promise.all(
        (kids ?? []).map(async (kid) => {
          const { count, error: choresError } = await supabase
            .from("kid_chores")
            .select("*", { count: "exact", head: true })
            .eq("kid_id", kid.id)
            .eq("status", "completed");

          if (choresError) {
            console.error("Error fetching kid chores count:", choresError);
          }

          return {
            id: kid.id,
            display_name: kid.display_name ?? "Kid",
            avatar_emoji: kid.avatar_emoji ?? "🧒",
            avatar_url: kid.avatar_url,
            current_balance: Number(kid.current_balance ?? 0),
            pendingChores: count || 0,
          };
        })
      );

      setLinkedKids(kidsWithChores);
    } catch (error) {
      console.error("Error fetching linked kids:", error);
      setLinkedKids([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = linkedKids.reduce((sum, kid) => sum + Number(kid.current_balance), 0);
  const totalPendingChores = linkedKids.reduce((sum, kid) => sum + kid.pendingChores, 0);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-12 bg-muted rounded" />
      </div>
    );
  }

  // No kids linked yet - Show inviting empty state
  if (linkedKids.length === 0) {
    return (
      <>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Family Financial Wellness</p>
          <div className="text-center py-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-2">
              <Heart className="h-7 w-7 text-pink-500" />
            </div>
            <p className="text-sm font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Teach Kids About Money
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Manage allowances, assign chores, and build healthy financial habits together
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
              onClick={() => setOnboardingOpen(true)}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Get Started
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="px-3"
              onClick={() => navigate("/kids")}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <FamilyOnboardingModal 
          open={onboardingOpen} 
          onOpenChange={setOnboardingOpen} 
        />
      </>
    );
  }

  // Has linked kids
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">KidsBloom Family</p>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
          {linkedKids.length} {linkedKids.length === 1 ? "kid" : "kids"}
        </span>
      </div>

      {/* Avatar Stack with Add Button */}
      <div className="flex items-center justify-between">
        <AvatarStack
          avatars={linkedKids.map(kid => ({
            id: kid.id,
            name: kid.display_name,
            emoji: kid.avatar_emoji,
            imageUrl: kid.avatar_url || undefined,
          }))}
          maxDisplay={4}
          size="md"
          showAddButton={true}
          onAddClick={() => navigate("/kids", { state: { openLinkModal: true } })}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span className="text-xs">Total Balance</span>
          </div>
          <p className="text-sm font-semibold">${totalBalance.toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Pending Approval</span>
          </div>
          <p className="text-sm font-semibold">{totalPendingChores} chores</p>
        </div>
      </div>

      {/* Action Button */}
      <Button 
        size="sm" 
        variant="outline" 
        className="w-full" 
        onClick={() => navigate("/kids")}
      >
        <Users className="h-4 w-4 mr-1" />
        Manage Kids
      </Button>
    </div>
  );
};
