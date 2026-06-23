import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AddSavingsGoalModal } from "./AddSavingsGoalModal";
import { FundGoalModal } from "./FundGoalModal";

interface SavingsGoalsSectionProps {
  kidId: string;
  variant: "playful" | "modern";
  currentBalance?: number;
  onBalanceUpdate?: () => void;
  isDarkMode?: boolean;
}

interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  target_date: string | null;
}

export const SavingsGoalsSection = ({ kidId, variant, currentBalance = 0, onBalanceUpdate, isDarkMode = false }: SavingsGoalsSectionProps) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [fundingGoal, setFundingGoal] = useState<SavingsGoal | null>(null);
  const isPlayful = variant === "playful";
  
  // Modern light mode colors
  const getModernBg = () => isDarkMode ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white/90 backdrop-blur-sm border border-teal-100";
  const getModernText = () => isDarkMode ? "text-white" : "text-teal-800";
  const getModernTextMuted = () => isDarkMode ? "text-white/60" : "text-teal-600";
  const getModernCardBg = () => isDarkMode ? "bg-white/5" : "bg-teal-50/50";

  const fetchGoals = async () => {
    const { data } = await supabase
      .from("kid_savings_goals")
      .select("*")
      .eq("kid_id", kidId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (data) setGoals(data);
  };

  useEffect(() => {
    fetchGoals();
  }, [kidId]);

  const handleFundSuccess = () => {
    fetchGoals();
    onBalanceUpdate?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${isPlayful ? "bg-gradient-to-br from-blue-50 to-purple-50" : getModernBg()}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{isPlayful ? "🎯" : "💎"}</span>
          <h3 className={`text-lg font-bold ${isPlayful ? "text-purple-600" : getModernText()}`}>
            {isPlayful ? "My Treasure Goals" : "Savings Goals"}
          </h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className={isPlayful ? "bg-purple-500 hover:bg-purple-600" : "bg-emerald-500 hover:bg-emerald-600"}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.length > 0 ? (
          goals.map((goal, index) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            const remaining = goal.target_amount - goal.current_amount;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-xl ${isPlayful ? "bg-white/80" : getModernCardBg()}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <motion.span
                    animate={isPlayful ? { rotate: [0, 10, -10, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {goal.icon || "🎁"}
                  </motion.span>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`font-bold ${isPlayful ? "text-purple-800" : getModernText()}`}>
                        {goal.title}
                      </p>
                      {currentBalance > 0 && remaining > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setFundingGoal(goal)}
                          className={`h-7 px-2 ${isPlayful ? "text-emerald-600 hover:bg-emerald-100" : "text-emerald-400 hover:bg-emerald-500/20"}`}
                        >
                          <PiggyBank className="h-4 w-4 mr-1" />
                          {isPlayful ? "Add" : "Fund"}
                        </Button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full h-3 rounded-full mt-2 ${isPlayful ? "bg-purple-100" : isDarkMode ? "bg-white/10" : "bg-teal-100"}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={`h-full rounded-full ${isPlayful ? "bg-gradient-to-r from-purple-400 to-pink-400" : "bg-emerald-500"}`}
                      />
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs ${isPlayful ? "text-purple-500" : getModernTextMuted()}`}>
                        {isPlayful
                          ? `🪙 ${goal.current_amount} / ${goal.target_amount}`
                          : `$${goal.current_amount.toFixed(2)} / $${goal.target_amount.toFixed(2)}`}
                      </span>
                      <span className={`text-xs font-medium ${isPlayful ? "text-pink-500" : "text-emerald-500"}`}>
                        {progress >= 100
                          ? isPlayful ? "🎉 Done!" : "Complete!"
                          : isPlayful
                            ? `${remaining} to go!`
                            : `$${remaining.toFixed(2)} remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className={`text-center py-6 ${isPlayful ? "text-purple-400" : getModernTextMuted()}`}>
            <span className="text-4xl block mb-2">{isPlayful ? "🏆" : "🎯"}</span>
            <p className="text-sm">
              {isPlayful ? "Set a goal to save for something special!" : "No savings goals yet"}
            </p>
          </div>
        )}
      </div>

      <AddSavingsGoalModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        kidId={kidId}
        variant={variant}
        onSuccess={fetchGoals}
      />

      {fundingGoal && (
        <FundGoalModal
          open={!!fundingGoal}
          onOpenChange={(open) => !open && setFundingGoal(null)}
          kidId={kidId}
          variant={variant}
          goal={fundingGoal}
          currentBalance={currentBalance}
          onSuccess={handleFundSuccess}
        />
      )}
    </motion.div>
  );
};
