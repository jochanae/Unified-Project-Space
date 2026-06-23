import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gamepad2, Pizza, Shirt, BookOpen, Gift, ShoppingBag } from "lucide-react";

interface SpendMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  onSuccess?: () => void;
}

const categories = [
  { id: "toys", label: "Toys", emoji: "🧸", icon: ShoppingBag },
  { id: "games", label: "Games", emoji: "🎮", icon: Gamepad2 },
  { id: "food", label: "Snacks", emoji: "🍕", icon: Pizza },
  { id: "clothes", label: "Clothes", emoji: "👕", icon: Shirt },
  { id: "books", label: "Books", emoji: "📚", icon: BookOpen },
  { id: "other", label: "Other", emoji: "🎁", icon: Gift },
];

export const SpendMoneyModal = ({ open, onOpenChange, kidId, variant, onSuccess }: SpendMoneyModalProps) => {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
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
      // Check spend_balance (the bucket linked to card)
      const { data: profile } = await supabase
        .from("kids_profiles")
        .select("spend_balance, current_balance, total_spent")
        .eq("id", kidId)
        .single();

      if (!profile || profile.spend_balance < numAmount) {
        toast.error(isPlayful ? "Not enough coins in Spend bucket! 😢" : "Insufficient spend balance");
        setIsLoading(false);
        return;
      }

      // Add transaction
      const { error: txError } = await supabase
        .from("kid_transactions")
        .insert({
          kid_id: kidId,
          type: "spending",
          amount: numAmount,
          description: description || categories.find(c => c.id === category)?.label || "Spending",
          category,
          bucket: "spend",
        });

      if (txError) throw txError;

      // Update spend_balance and total_spent
      await supabase
        .from("kids_profiles")
        .update({
          spend_balance: profile.spend_balance - numAmount,
          current_balance: profile.current_balance - numAmount, // Keep legacy field in sync
          total_spent: profile.total_spent + numAmount,
        })
        .eq("id", kidId);

      toast.success(isPlayful ? "Purchase made! 🛍️" : "Transaction recorded");
      onOpenChange(false);
      setAmount("");
      setDescription("");
      setCategory("other");
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error spending money:", error);
      toast.error("Failed to record spending");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlayful ? "bg-gradient-to-b from-pink-50 to-purple-50" : "bg-slate-900 border-emerald-500/30 text-white"}>
        <DialogHeader>
          <DialogTitle className={isPlayful ? "text-pink-600 text-center" : "text-white text-center"}>
            {isPlayful ? "Spend Coins 🛍️" : "Record Spending"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Category selection */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-pink-600" : "text-white"}>
              {isPlayful ? "What did you buy?" : "Category"}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <motion.button
                    key={cat.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCategory(cat.id)}
                    className={`
                      py-2 px-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1
                      ${category === cat.id
                        ? isPlayful
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                          : "bg-emerald-500 text-white"
                        : isPlayful
                          ? "bg-white text-pink-600 border-2 border-pink-200"
                          : "bg-white/10 text-white border border-white/20"
                      }
                    `}
                  >
                    {isPlayful ? (
                      <span className="text-lg">{cat.emoji}</span>
                    ) : (
                      <IconComponent className="w-5 h-5" />
                    )}
                    <span>{cat.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-pink-600" : "text-white"}>
              {isPlayful ? "How many coins?" : "Amount"}
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`text-2xl text-center font-bold h-14 ${isPlayful ? "border-pink-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-pink-600" : "text-white"}>
              {isPlayful ? "Tell us more! (optional)" : "Description (optional)"}
            </Label>
            <Input
              placeholder={isPlayful ? "New toy, candy..." : "Enter description"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={isPlayful ? "border-pink-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!amount || isLoading}
            className={`w-full h-12 text-lg ${isPlayful ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Processing..." : isPlayful ? "Spend Coins! 💸" : "Record Spending"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
