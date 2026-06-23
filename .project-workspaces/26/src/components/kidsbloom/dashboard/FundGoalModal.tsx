import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FundGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  goal: {
    id: string;
    title: string;
    icon: string;
    current_amount: number;
    target_amount: number;
  };
  currentBalance: number;
  onSuccess: () => void;
}

export const FundGoalModal = ({ 
  open, 
  onOpenChange, 
  kidId, 
  variant, 
  goal, 
  currentBalance,
  onSuccess 
}: FundGoalModalProps) => {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  const remaining = goal.target_amount - goal.current_amount;
  const maxFund = Math.min(remaining, currentBalance);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (numAmount > currentBalance) {
      toast.error(isPlayful ? "Not enough coins! 💰" : "Insufficient balance");
      return;
    }

    if (numAmount > remaining) {
      toast.error(isPlayful ? "That's more than you need! 🤔" : "Amount exceeds goal remaining");
      return;
    }

    setIsLoading(true);
    try {
      // Get current profile data
      const { data: profile, error: profileError } = await supabase
        .from("kids_profiles")
        .select("current_balance, total_saved")
        .eq("id", kidId)
        .single();

      if (profileError || !profile) throw profileError;

      // Update goal's current_amount
      const { error: goalError } = await supabase
        .from("kid_savings_goals")
        .update({ 
          current_amount: goal.current_amount + numAmount,
          is_completed: (goal.current_amount + numAmount) >= goal.target_amount,
          completed_at: (goal.current_amount + numAmount) >= goal.target_amount ? new Date().toISOString() : null
        })
        .eq("id", goal.id);

      if (goalError) throw goalError;

      // Update kid's profile: decrease balance, increase total_saved
      const { error: updateError } = await supabase
        .from("kids_profiles")
        .update({
          current_balance: profile.current_balance - numAmount,
          total_saved: profile.total_saved + numAmount,
        })
        .eq("id", kidId);

      if (updateError) throw updateError;

      // Log the transaction as "savings"
      const { error: txError } = await supabase
        .from("kid_transactions")
        .insert({
          kid_id: kidId,
          type: "savings",
          amount: numAmount,
          description: `Saved to: ${goal.title}`,
          category: "savings",
        });

      if (txError) throw txError;

      const isComplete = (goal.current_amount + numAmount) >= goal.target_amount;
      toast.success(
        isComplete 
          ? (isPlayful ? "🎉 Goal Complete! You did it!" : "Goal achieved!") 
          : (isPlayful ? "Money saved! 🌟" : "Funds added to goal")
      );
      
      onOpenChange(false);
      setAmount("");
      onSuccess();
    } catch (error: any) {
      console.error("Error funding goal:", error);
      toast.error("Failed to add funds");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    const actualAmount = Math.min(value, maxFund);
    setAmount(actualAmount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlayful ? "bg-gradient-to-b from-green-50 to-emerald-50" : "bg-slate-900 border-emerald-500/30 text-white"}>
        <DialogHeader>
          <DialogTitle className={`text-center flex items-center justify-center gap-2 ${isPlayful ? "text-emerald-600" : "text-white"}`}>
            <span className="text-2xl">{goal.icon}</span>
            {isPlayful ? "Add to Savings! 💰" : "Fund Goal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Goal Info */}
          <div className={`p-3 rounded-xl ${isPlayful ? "bg-white/80" : "bg-white/5"}`}>
            <p className={`font-bold ${isPlayful ? "text-emerald-700" : "text-white"}`}>{goal.title}</p>
            <p className={`text-sm ${isPlayful ? "text-emerald-600" : "text-white/60"}`}>
              {isPlayful 
                ? `🪙 ${goal.current_amount} saved of ${goal.target_amount}` 
                : `$${goal.current_amount.toFixed(2)} of $${goal.target_amount.toFixed(2)}`}
            </p>
            <p className={`text-xs mt-1 ${isPlayful ? "text-pink-500" : "text-emerald-400"}`}>
              {isPlayful ? `${remaining} more to go!` : `$${remaining.toFixed(2)} remaining`}
            </p>
          </div>

          {/* Available Balance */}
          <div className={`text-center p-2 rounded-lg ${isPlayful ? "bg-yellow-100" : "bg-white/5"}`}>
            <p className={`text-xs ${isPlayful ? "text-yellow-700" : "text-white/60"}`}>
              {isPlayful ? "Your available coins:" : "Available Balance:"}
            </p>
            <p className={`text-xl font-bold ${isPlayful ? "text-yellow-600" : "text-emerald-400"}`}>
              {isPlayful ? `🪙 ${currentBalance}` : `$${currentBalance.toFixed(2)}`}
            </p>
          </div>

          {/* Quick Amounts */}
          {currentBalance > 0 && (
            <div className="space-y-2">
              <Label className={isPlayful ? "text-emerald-600" : "text-white"}>
                {isPlayful ? "Quick add:" : "Quick Amount"}
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 5, 10, Math.floor(maxFund)].filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4).map((value) => (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQuickAmount(value)}
                    disabled={value > currentBalance}
                    className={`
                      p-2 rounded-lg text-sm font-bold transition-all
                      ${isPlayful 
                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50" 
                        : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"}
                    `}
                  >
                    {isPlayful ? `🪙${value}` : `$${value}`}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-emerald-600" : "text-white"}>
              {isPlayful ? "How much to save?" : "Amount ($)"}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={maxFund}
              className={`text-2xl text-center font-bold ${isPlayful ? "border-emerald-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount || isLoading || parseFloat(amount) <= 0}
            className={`w-full h-12 text-lg ${isPlayful ? "bg-gradient-to-r from-emerald-500 to-green-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Saving..." : isPlayful ? "Save It! 🐷" : "Add Funds"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
