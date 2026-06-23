import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check, Clock, Star, Zap, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddChoreModal } from "./AddChoreModal";

interface ChoresSectionProps {
  kidId: string;
  variant: "playful" | "modern";
}

interface Chore {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  due_date: string | null;
  icon: string;
  chore_type: string;
  is_bonus: boolean;
  claimed_by: string | null;
  family_group_id: string | null;
}

interface KidProfile {
  id: string;
  display_name: string | null;
  first_name: string | null;
}

export const ChoresSection = ({ kidId, variant }: ChoresSectionProps) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [bonusChores, setBonusChores] = useState<Chore[]>([]);
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const isPlayful = variant === "playful";

  const fetchKidProfile = async () => {
    const { data } = await supabase
      .from("kids_profiles")
      .select("id, display_name, first_name")
      .eq("id", kidId)
      .single();
    
    if (data) setKidProfile(data);
  };

  const fetchChores = async () => {
    // Fetch individual chores assigned to this kid
    const { data } = await supabase
      .from("kid_chores")
      .select("*")
      .eq("kid_id", kidId)
      .in("status", ["pending", "in_progress", "completed"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) setChores(data);
  };

  const fetchBonusChores = async () => {
    // First get the kid's family group
    const { data: kidData } = await supabase
      .from("family_group_members")
      .select("family_group_id")
      .eq("kid_profile_id", kidId)
      .single();

    if (!kidData?.family_group_id) return;

    // Fetch unclaimed bonus chores from the family group
    const { data } = await supabase
      .from("kid_chores")
      .select("*")
      .eq("family_group_id", kidData.family_group_id)
      .eq("chore_type", "bonus")
      .is("claimed_by", null)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3);

    if (data) setBonusChores(data);
  };

  useEffect(() => {
    fetchKidProfile();
    fetchChores();
    fetchBonusChores();
  }, [kidId]);

  const handleCompleteChore = async (choreId: string, choreTitle: string) => {
    try {
      await supabase
        .from("kid_chores")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", choreId);

      // Notify parent(s) that a chore is ready for approval
      if (kidProfile) {
        const { data: familyLinks } = await supabase
          .from("family_links")
          .select("parent_user_id")
          .eq("kid_profile_id", kidProfile.id)
          .eq("status", "active");

        if (familyLinks && familyLinks.length > 0) {
          const notifications = familyLinks.map(link => ({
            user_id: link.parent_user_id,
            title: "Chore Ready for Approval! ✅",
            message: `${kidProfile.display_name || kidProfile.first_name} completed "${choreTitle}"`,
            type: "info",
            action_url: "/kids",
          }));
          
          await supabase.from("notifications").insert(notifications);
        }
      }

      toast.success(isPlayful ? "Great job! ⭐ Waiting for approval!" : "Marked as complete!");
      fetchChores();
    } catch (error) {
      toast.error("Failed to complete chore");
    }
  };

  const handleClaimBonus = async (choreId: string) => {
    try {
      // Check if already claimed
      const { data: chore } = await supabase
        .from("kid_chores")
        .select("claimed_by")
        .eq("id", choreId)
        .single();

      if (chore?.claimed_by) {
        toast.error("Someone already grabbed this one!");
        fetchBonusChores();
        return;
      }

      const { error } = await supabase
        .from("kid_chores")
        .update({
          claimed_by: kidId,
          claimed_at: new Date().toISOString(),
          kid_id: kidId,
        })
        .eq("id", choreId);

      if (error) throw error;
      toast.success(isPlayful ? "You got it! 🏆 Now complete it!" : "Claimed! Complete it to earn the reward.");
      fetchChores();
      fetchBonusChores();
    } catch (error) {
      toast.error("Failed to claim task");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return isPlayful ? "bg-yellow-100 text-yellow-700" : "bg-yellow-500/20 text-yellow-400";
      case "in_progress":
        return isPlayful ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-400";
      case "completed":
        return isPlayful ? "bg-green-100 text-green-700" : "bg-green-500/20 text-green-400";
      default:
        return isPlayful ? "bg-gray-100 text-gray-700" : "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* Bonus Chores Section */}
      {bonusChores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-4 ${isPlayful ? "bg-gradient-to-br from-yellow-100 to-orange-100" : "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-yellow-500/30"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <h3 className={`text-lg font-bold ${isPlayful ? "text-orange-600" : "text-yellow-400"}`}>
                Grab First!
              </h3>
            </div>
            <Badge className="bg-yellow-500 text-white animate-pulse">
              <Zap className="h-3 w-3 mr-1" />
              Bonus
            </Badge>
          </div>
          <p className={`text-xs mb-3 ${isPlayful ? "text-orange-500" : "text-yellow-300/70"}`}>
            Be the first to claim and complete for extra rewards!
          </p>
          <div className="space-y-2">
            {bonusChores.map((chore, index) => (
              <motion.div
                key={chore.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center gap-3 p-3 rounded-xl
                  ${isPlayful ? "bg-white/90 shadow-md" : "bg-white/10"}
                `}
              >
                <span className="text-2xl">{chore.icon || "⭐"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isPlayful ? "text-orange-800" : "text-white"}`}>
                    {chore.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${isPlayful ? "text-yellow-600" : "text-yellow-400"}`}>
                      {isPlayful ? `🪙 $${chore.reward_amount}` : `$${chore.reward_amount}`}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleClaimBonus(chore.id)}
                  className={isPlayful 
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white" 
                    : "bg-yellow-500 hover:bg-yellow-600"
                  }
                >
                  <Hand className="h-4 w-4 mr-1" />
                  Grab!
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Regular Chores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 ${isPlayful ? "bg-gradient-to-br from-yellow-50 to-orange-50" : "bg-white/5 backdrop-blur-sm border border-white/10"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isPlayful ? "✨" : "📋"}</span>
            <h3 className={`text-lg font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
              {isPlayful ? "My Chores" : "Tasks"}
            </h3>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className={isPlayful ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-500 hover:bg-emerald-600"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Chores List */}
        <div className="space-y-2">
          {chores.length > 0 ? (
            chores.map((chore, index) => (
              <motion.div
                key={chore.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center gap-3 p-3 rounded-xl
                  ${chore.is_bonus 
                    ? isPlayful 
                      ? "bg-gradient-to-r from-yellow-100/80 to-orange-100/80" 
                      : "bg-gradient-to-r from-yellow-500/10 to-orange-500/10"
                    : isPlayful ? "bg-white/80" : "bg-white/5"
                  }
                `}
              >
                {/* Icon */}
                <span className="text-2xl">{chore.icon || "⭐"}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`font-medium truncate ${isPlayful ? "text-orange-800" : "text-white"}`}>
                      {chore.title}
                    </p>
                    {chore.is_bonus && (
                      <Badge className="bg-yellow-500/20 text-yellow-600 text-[9px] px-1 py-0">
                        <Zap className="h-2 w-2" />
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(chore.status)}`}>
                      {chore.status === "in_progress" ? "Doing" : chore.status === "completed" ? "Done!" : "Todo"}
                    </span>
                    {chore.reward_amount > 0 && (
                      <span className={`text-xs font-bold ${isPlayful ? "text-yellow-600" : "text-emerald-400"}`}>
                        {isPlayful ? `🪙 ${chore.reward_amount}` : `$${chore.reward_amount}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {chore.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCompleteChore(chore.id, chore.title)}
                    className={isPlayful ? "text-green-600 hover:bg-green-100" : "text-emerald-400 hover:bg-emerald-500/20"}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                )}
                {chore.status === "completed" && (
                  <span className="text-green-500 text-xl">✓</span>
                )}
              </motion.div>
            ))
          ) : (
            <div className={`text-center py-6 ${isPlayful ? "text-orange-400" : "text-white/50"}`}>
              <span className="text-4xl block mb-2">{isPlayful ? "🌟" : "📝"}</span>
              <p className="text-sm">
                {isPlayful ? "No chores yet! Time to help out!" : "No tasks assigned"}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      <AddChoreModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        kidId={kidId}
        variant={variant}
        onSuccess={fetchChores}
      />
    </div>
  );
};