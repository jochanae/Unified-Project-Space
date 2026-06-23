import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock, Star, Users, Sparkles, Trophy, Zap, Plus, Hand } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface SharedChoreBoardProps {
  familyGroupId: string;
  onAddChore?: () => void;
}

interface GroupChore {
  id: string;
  kid_id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: "pending" | "completed" | "approved";
  due_date: string | null;
  is_group_visible: boolean;
  family_group_id: string | null;
  completed_at: string | null;
  approved_at: string | null;
  icon: string | null;
  chore_type: "individual" | "family" | "bonus";
  is_bonus: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  kid_profile?: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  };
  claimer_profile?: {
    id: string;
    display_name: string;
    avatar_emoji: string;
  };
}

export const SharedChoreBoard = ({ familyGroupId, onAddChore }: SharedChoreBoardProps) => {
  const { user } = useAuth();
  const [chores, setChores] = useState<GroupChore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "bonus" | "pending" | "completed">("all");
  const [currentKidId, setCurrentKidId] = useState<string | null>(null);

  // Get current kid's ID if viewing as a kid
  useEffect(() => {
    const fetchCurrentKid = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("kids_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setCurrentKidId(data.id);
    };
    fetchCurrentKid();
  }, [user]);

  const fetchChores = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("kid_chores")
      .select(`
        *,
        kid_profile:kids_profiles!kid_chores_kid_id_fkey(id, display_name, avatar_emoji)
      `)
      .eq("family_group_id", familyGroupId)
      .eq("is_group_visible", true)
      .order("is_bonus", { ascending: false })
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Fetch chores error:", error);
    } else if (data) {
      // Fetch claimer profiles for bonus chores
      const choresWithClaimers = await Promise.all(
        (data as GroupChore[]).map(async (chore) => {
          if (chore.claimed_by) {
            const { data: claimer } = await supabase
              .from("kids_profiles")
              .select("id, display_name, avatar_emoji")
              .eq("id", chore.claimed_by)
              .single();
            return { ...chore, claimer_profile: claimer };
          }
          return chore;
        })
      );
      setChores(choresWithClaimers);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChores();

    const channel = supabase
      .channel(`group-chores:${familyGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kid_chores",
          filter: `family_group_id=eq.${familyGroupId}`,
        },
        () => {
          fetchChores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyGroupId]);

  const claimBonusChore = async (choreId: string) => {
    if (!currentKidId) {
      toast.error("Only kids can claim bonus chores");
      return;
    }

    try {
      // Check if already claimed
      const { data: chore } = await supabase
        .from("kid_chores")
        .select("claimed_by")
        .eq("id", choreId)
        .single();

      if (chore?.claimed_by) {
        toast.error("This task has already been claimed!");
        return;
      }

      const { error } = await supabase
        .from("kid_chores")
        .update({
          claimed_by: currentKidId,
          claimed_at: new Date().toISOString(),
          kid_id: currentKidId, // Reassign to the claimer
        })
        .eq("id", choreId);

      if (error) throw error;
      toast.success("You claimed this task! Complete it to earn the reward! 🏆");
      fetchChores();
    } catch (error: any) {
      toast.error("Failed to claim task");
    }
  };

  const approveChore = async (choreId: string, rewardAmount: number, kidId: string) => {
    try {
      // Update chore status
      const { error } = await supabase
        .from("kid_chores")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", choreId);

      if (error) throw error;

      // Add reward if applicable
      if (rewardAmount > 0) {
        await supabase
          .from("kid_transactions")
          .insert({
            kid_id: kidId,
            type: "chore_reward",
            amount: rewardAmount,
            description: `Chore reward`,
            related_chore_id: choreId,
          });

        // Update kid's balance
        const { data: profile } = await supabase
          .from("kids_profiles")
          .select("current_balance, total_earned")
          .eq("id", kidId)
          .single();

        if (profile) {
          await supabase
            .from("kids_profiles")
            .update({
              current_balance: profile.current_balance + rewardAmount,
              total_earned: profile.total_earned + rewardAmount,
            })
            .eq("id", kidId);
        }
      }

      toast.success("Chore approved! Reward sent! 🎉");
      fetchChores();
    } catch (error: any) {
      toast.error("Failed to approve chore");
    }
  };

  const filteredChores = chores.filter((chore) => {
    if (filter === "bonus") return chore.is_bonus || chore.chore_type === "bonus";
    if (filter === "pending") return chore.status === "pending" || chore.status === "completed";
    if (filter === "completed") return chore.status === "approved";
    return true;
  });

  const pendingCount = chores.filter(c => c.status === "pending" || c.status === "completed").length;
  const completedCount = chores.filter(c => c.status === "approved").length;
  const bonusCount = chores.filter(c => (c.is_bonus || c.chore_type === "bonus") && c.status !== "approved").length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "completed":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px] px-1.5 py-0">Done</Badge>;
      case "completed":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-[10px] px-1.5 py-0">Review</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Todo</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 dark:from-emerald-950/20 dark:to-cyan-950/20 border-emerald-200/50">
        <CardContent className="py-6 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 dark:from-emerald-950/20 dark:to-cyan-950/20 border-emerald-200/50">
      <CardHeader className="py-2.5 px-3 sm:px-4 border-b border-emerald-100/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Trophy className="h-3.5 w-3.5 text-white" />
            </div>
            <CardTitle className="text-sm font-medium">Family Chore Board</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            {bonusCount > 0 && (
              <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 h-5 text-yellow-600 border-yellow-200 bg-yellow-500/10">
                <Zap className="h-2.5 w-2.5" />
                {bonusCount}
              </Badge>
            )}
            <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 h-5">
              <Clock className="h-2.5 w-2.5" />
              {pendingCount}
            </Badge>
            <Badge variant="outline" className="gap-0.5 text-[10px] px-1.5 py-0 h-5 text-green-600 border-green-200">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {completedCount}
            </Badge>
            {onAddChore && (
              <Button size="sm" variant="ghost" onClick={onAddChore} className="h-6 w-6 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 sm:p-3 space-y-2 sm:space-y-3">
        {/* Filter Tabs - Scrollable on mobile */}
        <ScrollArea className="w-full">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="h-7 sm:h-8 p-0.5 bg-muted/50 w-full sm:w-auto inline-flex">
              <TabsTrigger value="all" className="text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3">
                All ({chores.length})
              </TabsTrigger>
              <TabsTrigger value="bonus" className="text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3 gap-1">
                <Zap className="h-3 w-3 text-yellow-500" />
                Bonus ({bonusCount})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3">
                Active ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-[10px] sm:text-xs h-6 sm:h-7 px-2 sm:px-3">
                Done ({completedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Chores List */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredChores.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6"
              >
                <div className="text-3xl mb-1.5">✨</div>
                <p className="text-muted-foreground text-xs">
                  {filter === "bonus" 
                    ? "No bonus tasks available!"
                    : filter === "all" 
                      ? "No shared chores yet!"
                      : `No ${filter} chores`
                  }
                </p>
              </motion.div>
            ) : (
              filteredChores.map((chore) => (
                <motion.div
                  key={chore.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`
                    p-2.5 sm:p-3 rounded-xl border transition-all
                    ${chore.is_bonus || chore.chore_type === "bonus"
                      ? "bg-gradient-to-r from-yellow-50/80 to-orange-50/80 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-300/50"
                      : chore.status === "approved" 
                        ? "bg-green-50/50 dark:bg-green-950/20 border-green-200/50" 
                        : chore.status === "completed"
                          ? "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200/50"
                          : "bg-white dark:bg-card border-border/50"
                    }
                  `}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {/* Status Icon or Bonus Indicator */}
                    <div className="mt-0.5 shrink-0">
                      {chore.is_bonus || chore.chore_type === "bonus" ? (
                        <div className="p-1 rounded-full bg-yellow-500/20">
                          <Zap className="h-3 w-3 text-yellow-600" />
                        </div>
                      ) : (
                        getStatusIcon(chore.status)
                      )}
                    </div>

                    {/* Chore Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-base">{chore.icon || "📋"}</span>
                        <span className={`font-medium text-xs sm:text-sm truncate ${chore.status === "approved" ? "line-through text-muted-foreground" : ""}`}>
                          {chore.title}
                        </span>
                        {(chore.is_bonus || chore.chore_type === "bonus") && !chore.claimed_by && (
                          <Badge className="bg-yellow-500 text-white text-[9px] px-1 py-0 animate-pulse">
                            GRAB IT!
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Assigned/Claimed Kid */}
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-pink-200 to-purple-200">
                              {chore.claimer_profile?.avatar_emoji || chore.kid_profile?.avatar_emoji || "🧒"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                            {chore.claimed_by 
                              ? `${chore.claimer_profile?.display_name || "Claimed"}`
                              : chore.kid_profile?.display_name
                            }
                          </span>
                        </div>

                        {/* Due Date */}
                        {chore.due_date && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(chore.due_date), "MMM d")}
                          </span>
                        )}

                        {/* Reward */}
                        <span className={`text-[10px] font-medium flex items-center gap-0.5 ${chore.is_bonus ? "text-yellow-600" : "text-emerald-600"}`}>
                          <Star className="h-2.5 w-2.5" />
                          ${chore.reward_amount.toFixed(2)}
                        </span>

                        {/* Status Badge */}
                        {getStatusBadge(chore.status)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="shrink-0 flex gap-1">
                      {/* Claim Button for unclaimed bonus chores (kid view) */}
                      {(chore.is_bonus || chore.chore_type === "bonus") && 
                       !chore.claimed_by && 
                       chore.status === "pending" && 
                       currentKidId && (
                        <Button
                          size="sm"
                          onClick={() => claimBonusChore(chore.id)}
                          className="shrink-0 gap-1 h-7 text-[10px] px-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        >
                          <Hand className="h-3 w-3" />
                          Claim
                        </Button>
                      )}

                      {/* Approve Button */}
                      {chore.status === "completed" && !currentKidId && (
                        <Button
                          size="sm"
                          onClick={() => approveChore(chore.id, chore.reward_amount, chore.claimed_by || chore.kid_id)}
                          className="shrink-0 gap-1 h-7 text-[10px] px-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};