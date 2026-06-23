import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  onSuccess?: () => void;
}

const quickAmounts = [1, 5, 10, 20];

export const AddMoneyModal = ({ open, onOpenChange, kidId, variant, onSuccess }: AddMoneyModalProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      // Get current profile with split percentages
      const { data: profile } = await supabase
        .from("kids_profiles")
        .select("spend_balance, save_balance, give_balance, current_balance, total_earned, split_spend_percent, split_save_percent, split_give_percent")
        .eq("id", kidId)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Calculate split amounts based on percentages
      const spendAmount = numAmount * (profile.split_spend_percent / 100);
      const saveAmount = numAmount * (profile.split_save_percent / 100);
      const giveAmount = numAmount * (profile.split_give_percent / 100);

      // Add transaction
      const { error: txError } = await supabase
        .from("kid_transactions")
        .insert({
          kid_id: kidId,
          type: "deposit",
          amount: numAmount,
          description: description || "Added money",
          bucket: "spend", // Primary bucket for deposits
        });

      if (txError) throw txError;

      // Update all bucket balances and totals
      await supabase
        .from("kids_profiles")
        .update({
          spend_balance: profile.spend_balance + spendAmount,
          save_balance: profile.save_balance + saveAmount,
          give_balance: profile.give_balance + giveAmount,
          current_balance: profile.current_balance + numAmount, // Keep legacy field in sync
          total_earned: profile.total_earned + numAmount,
        })
        .eq("id", kidId);

      const splitInfo = profile.split_spend_percent < 100 
        ? ` (${profile.split_spend_percent}% spend, ${profile.split_save_percent}% save, ${profile.split_give_percent}% give)`
        : "";
      
      toast.success(isPlayful ? "Coins added! 🪙✨" : `Money added!${splitInfo}`);
      onOpenChange(false);
      setAmount("");
      setDescription("");
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error adding money:", error);
      toast.error("Failed to add money");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlayful ? "bg-gradient-to-b from-purple-50 to-pink-50" : "bg-slate-900 border-emerald-500/30 text-white"}>
        <DialogHeader>
          <DialogTitle className={isPlayful ? "text-purple-600 text-center" : "text-white text-center"}>
            {isPlayful ? "Add Magic Coins! 🪙" : "Add Money"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amt) => (
              <motion.button
                key={amt}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAmount(amt.toString())}
                className={`
                  py-3 rounded-xl font-bold text-lg transition-all
                  ${amount === amt.toString()
                    ? isPlayful
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-emerald-500 text-white"
                    : isPlayful
                      ? "bg-white text-purple-600 border-2 border-purple-200"
                      : "bg-white/10 text-white border border-white/20"
                  }
                `}
              >
                {isPlayful ? `${amt}` : `$${amt}`}
              </motion.button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-purple-600" : "text-white"}>
              {isPlayful ? "Or enter your own:" : "Amount"}
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`text-2xl text-center font-bold h-14 ${isPlayful ? "border-purple-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-purple-600" : "text-white"}>
              {isPlayful ? "What's this for? (optional)" : "Description (optional)"}
            </Label>
            <Input
              placeholder={isPlayful ? "Birthday gift, allowance..." : "Enter description"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={isPlayful ? "border-purple-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount || isLoading}
            className={`w-full h-12 text-lg ${isPlayful ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Adding..." : isPlayful ? "Add Coins! ✨" : "Add Money"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
