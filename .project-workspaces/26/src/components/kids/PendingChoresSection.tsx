import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, X, Clock, Plus, ListChecks, Zap, Star, Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AssignChoreModal } from "./AssignChoreModal";

interface PendingChoresSectionProps {
  kidId: string;
  kidName?: string;
  familyGroupId?: string;
  onApprove: () => void;
}

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

interface Chore {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  icon: string;
  completed_at: string | null;
  due_date: string | null;
  chore_type: string;
  is_bonus: boolean;
  claimed_by: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  checklist: ChecklistItem[] | any;
}

export const PendingChoresSection = ({ kidId, kidName = "Child", familyGroupId, onApprove }: PendingChoresSectionProps) => {
  const [chores, setChores] = useState<Chore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const fetchChores = async () => {
    const { data } = await supabase
      .from("kid_chores")
      .select("*")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false });

    if (data) setChores(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChores();
  }, [kidId]);

  const handleApprove = async (chore: Chore) => {
    try {
      // Update chore status
      await supabase
        .from("kid_chores")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", chore.id);

      // Mark related notifications as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .ilike("message", `%${chore.title}%`);

      // Add reward as transaction
      if (chore.reward_amount > 0) {
        await supabase
          .from("kid_transactions")
          .insert({
            kid_id: kidId,
            type: "chore_reward",
            amount: chore.reward_amount,
            description: `Reward for: ${chore.title}`,
            related_chore_id: chore.id,
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
              current_balance: profile.current_balance + chore.reward_amount,
              total_earned: profile.total_earned + chore.reward_amount,
            })
            .eq("id", kidId);
        }
      }

      toast.success("Chore approved! Reward sent to your child.");
      fetchChores();
      onApprove();
    } catch (error) {
      toast.error("Failed to approve chore");
    }
  };

  const handleReject = async (choreId: string, choreTitle: string) => {
    try {
      await supabase
        .from("kid_chores")
        .update({ status: "pending" }) // Send back to pending
        .eq("id", choreId);

      // Mark related notifications as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .ilike("message", `%${choreTitle}%`);

      toast.success("Chore sent back for more work");
      fetchChores();
    } catch (error) {
      toast.error("Failed to update chore");
    }
  };

  const pendingChores = chores.filter(c => c.status === "completed");
  const activeChores = chores.filter(c => c.status === "pending" || c.status === "in_progress");
  const completedChores = chores.filter(c => c.status === "approved" || c.status === "rejected");

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700",
      in_progress: "bg-blue-100 text-blue-700",
      completed: "bg-purple-100 text-purple-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-4">
      {/* Premium Assign New Chore Button */}
      <Card className="border-2 border-purple-200/50 dark:border-purple-800/50 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 overflow-hidden">
        <CardContent className="py-4 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-50" />
          <Button 
            onClick={() => setShowAssignModal(true)}
            className="w-full gap-2 relative bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Assign New Chore to {kidName}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-2 relative">
            Teach responsibility with fun rewards! 🎯
          </p>
        </CardContent>
      </Card>

      {/* Pending Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Waiting for Your Approval ({pendingChores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingChores.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-4xl block mb-2">✅</span>
              <p className="text-muted-foreground">No chores waiting for approval</p>
              <p className="text-xs text-muted-foreground mt-1">
                When your child marks a chore as done, it will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingChores.map((chore, index) => (
                <motion.div
                  key={chore.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    chore.is_bonus || chore.chore_type === "bonus"
                      ? "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 border-yellow-300"
                      : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                  }`}
                >
                  <span className="text-2xl">{chore.icon || "⭐"}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{chore.title}</p>
                      {(chore.is_bonus || chore.chore_type === "bonus") && (
                        <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0">
                          <Zap className="h-2.5 w-2.5 mr-0.5" />
                          Bonus
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completed by {kidName}
                    </p>
                    {chore.reward_amount > 0 && (
                      <p className={`text-sm font-semibold mt-1 flex items-center gap-1 ${
                        chore.is_bonus ? "text-yellow-600" : "text-green-600"
                      }`}>
                        <Star className="h-3 w-3" />
                        Reward: ${chore.reward_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(chore.id, chore.title)}
                      className="text-red-500 hover:bg-red-50 border-red-200"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Needs Work
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(chore)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Chores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Active Chores ({activeChores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeChores.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-4xl block mb-2">📝</span>
              <p className="text-muted-foreground">No active chores</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Assign New Chore" above to give {kidName} something to do!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeChores.map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-xl">{chore.icon || "⭐"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{chore.title}</p>
                    {chore.due_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(chore.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {chore.reward_amount > 0 && (
                      <span className="text-xs font-semibold text-green-600">
                        ${chore.reward_amount.toFixed(2)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(chore.status)}`}>
                      {chore.status === "in_progress" ? "Working" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed History */}
      {completedChores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Recent History ({completedChores.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedChores.slice(0, 5).map((chore) => (
                <div
                  key={chore.id}
                  className="flex items-center gap-3 p-2 rounded-lg opacity-70"
                >
                  <span className="text-lg">{chore.icon || "⭐"}</span>
                  <div className="flex-1">
                    <p className="text-sm">{chore.title}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(chore.status)}`}>
                    {chore.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AssignChoreModal
        open={showAssignModal}
        onOpenChange={setShowAssignModal}
        kidId={kidId}
        kidName={kidName}
        familyGroupId={familyGroupId}
        onSuccess={fetchChores}
      />
    </div>
  );
};
