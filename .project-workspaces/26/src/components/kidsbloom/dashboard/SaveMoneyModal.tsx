import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PiggyBank, Target, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SavingsGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  icon: string | null;
}

interface SaveMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  spendBalance: number;
  onSuccess?: () => void;
}

export const SaveMoneyModal = ({
  open,
  onOpenChange,
  kidId,
  variant,
  spendBalance,
  onSuccess,
}: SaveMoneyModalProps) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [saveToGeneral, setSaveToGeneral] = useState(true); // Default to general save bucket
  const isPlayful = variant === "playful";

  useEffect(() => {
    if (open) {
      fetchGoals();
      setSelectedGoal(null);
      setAmount("");
      setSaveToGeneral(true);
    }
  }, [open, kidId]);

  const fetchGoals = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from("kid_savings_goals")
        .select("*")
        .eq("kid_id", kidId)
        .eq("is_completed", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast.error("Failed to load savings goals");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    const saveAmount = parseFloat(amount);
    if (isNaN(saveAmount) || saveAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (saveAmount > spendBalance) {
      toast.error(isPlayful ? "Not enough in Spend bucket! 💸" : "Insufficient spend balance");
      return;
    }

    // If saving to a specific goal, check remaining amount needed
    if (!saveToGeneral && selectedGoal) {
      const remaining = selectedGoal.target_amount - selectedGoal.current_amount;
      if (saveAmount > remaining) {
        toast.error(`You only need $${remaining.toFixed(2)} more to reach this goal!`);
        return;
      }
    }

    setIsLoading(true);
    try {
      // Get current profile balances
      const { data: profile, error: profileFetchError } = await supabase
        .from("kids_profiles")
        .select("spend_balance, save_balance, current_balance, total_saved")
        .eq("id", kidId)
        .single();

      if (profileFetchError || !profile) throw profileFetchError;

      // If saving to a specific goal, update the goal too
      if (!saveToGeneral && selectedGoal) {
        const newGoalAmount = selectedGoal.current_amount + saveAmount;
        const isCompleted = newGoalAmount >= selectedGoal.target_amount;

        const { error: goalError } = await supabase
          .from("kid_savings_goals")
          .update({
            current_amount: newGoalAmount,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
          })
          .eq("id", selectedGoal.id);

        if (goalError) throw goalError;
      }

      // Move money from Spend bucket to Save bucket
      const { error: profileError } = await supabase
        .from("kids_profiles")
        .update({
          spend_balance: profile.spend_balance - saveAmount,
          save_balance: profile.save_balance + saveAmount,
          current_balance: profile.current_balance - saveAmount, // Keep legacy in sync
          total_saved: (profile.total_saved || 0) + saveAmount,
        })
        .eq("id", kidId);

      if (profileError) throw profileError;

      // Log the transaction
      const { error: transactionError } = await supabase
        .from("kid_transactions")
        .insert({
          kid_id: kidId,
          amount: saveAmount,
          type: "savings",
          description: saveToGeneral 
            ? "Moved to Save bucket" 
            : `Saved to: ${selectedGoal?.title}`,
          category: "savings",
          bucket: "save",
        });

      if (transactionError) throw transactionError;

      const isComplete = !saveToGeneral && selectedGoal && 
        (selectedGoal.current_amount + saveAmount) >= selectedGoal.target_amount;

      toast.success(
        isComplete
          ? `🎉 Goal "${selectedGoal?.title}" completed!`
          : isPlayful 
            ? "Money saved! 🐷✨" 
            : `Saved $${saveAmount.toFixed(2)} to ${saveToGeneral ? "Save bucket" : selectedGoal?.title}!`
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving money:", error);
      toast.error("Failed to save money. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [1, 5, 10, 20];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-md ${
          isPlayful
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200"
            : "bg-background"
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-bold flex items-center gap-2 ${
              isPlayful ? "text-emerald-700" : ""
            }`}
          >
            <PiggyBank className="h-6 w-6" />
            {isPlayful ? "Move to Savings! 🐷" : "Save Money"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Spend Bucket */}
          <div
            className={`p-3 rounded-xl text-center ${
              isPlayful ? "bg-purple-100" : "bg-muted"
            }`}
          >
            <p className={`text-xs ${isPlayful ? "text-purple-600" : "text-muted-foreground"}`}>
              {isPlayful ? "From Spend Bucket 💳" : "Available in Spend"}
            </p>
            <p className={`text-2xl font-bold ${isPlayful ? "text-purple-500" : "text-primary"}`}>
              ${spendBalance.toFixed(2)}
            </p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className={`h-6 w-6 ${isPlayful ? "text-emerald-500" : "text-muted-foreground"}`} />
          </div>

          {/* Save Destination Toggle */}
          <div className="space-y-2">
            <p className={`text-sm font-medium ${isPlayful ? "text-emerald-700" : ""}`}>
              {isPlayful ? "Where to save?" : "Save to:"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={saveToGeneral ? "default" : "outline"}
                onClick={() => { setSaveToGeneral(true); setSelectedGoal(null); }}
                className={saveToGeneral 
                  ? (isPlayful ? "bg-emerald-500 hover:bg-emerald-600" : "") 
                  : ""}
              >
                <PiggyBank className="h-4 w-4 mr-2" />
                {isPlayful ? "Save Bucket 🐷" : "Save Bucket"}
              </Button>
              <Button
                variant={!saveToGeneral ? "default" : "outline"}
                onClick={() => setSaveToGeneral(false)}
                disabled={goals.length === 0}
                className={!saveToGeneral 
                  ? (isPlayful ? "bg-emerald-500 hover:bg-emerald-600" : "") 
                  : ""}
              >
                <Target className="h-4 w-4 mr-2" />
                {isPlayful ? "A Goal 🎯" : "Specific Goal"}
              </Button>
            </div>
          </div>

          {/* Goal Selection (if saving to goal) */}
          {!saveToGeneral && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              {isFetching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No savings goals yet!</p>
                  <p className="text-sm">Create a goal first.</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {goals.map((goal) => {
                    const progress = (goal.current_amount / goal.target_amount) * 100;
                    const remaining = goal.target_amount - goal.current_amount;
                    const isSelected = selectedGoal?.id === goal.id;

                    return (
                      <motion.button
                        key={goal.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedGoal(goal)}
                        className={`p-3 rounded-xl text-left transition-all ${
                          isSelected
                            ? isPlayful
                              ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                              : "bg-primary text-primary-foreground"
                            : isPlayful
                            ? "bg-white hover:bg-emerald-100 border border-emerald-200"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{goal.icon || "🎯"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{goal.title}</p>
                            <p className={`text-xs ${isSelected ? "opacity-80" : "text-muted-foreground"}`}>
                              ${remaining.toFixed(2)} left
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{progress.toFixed(0)}%</p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Amount Input */}
          {(saveToGeneral || selectedGoal) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(amt.toString())}
                    disabled={amt > spendBalance}
                    className={`flex-1 ${
                      isPlayful ? "border-emerald-300 hover:bg-emerald-100" : ""
                    }`}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`pl-8 text-xl font-bold h-14 ${
                    isPlayful ? "border-emerald-300 focus:ring-emerald-500" : ""
                  }`}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={
                  isLoading ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > spendBalance ||
                  (!saveToGeneral && !selectedGoal)
                }
                className={`w-full h-12 text-base font-bold ${
                  isPlayful
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    : ""
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <PiggyBank className="h-5 w-5 mr-2" />
                    {isPlayful ? "Save It! 🐷" : "Move to Savings"}
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
