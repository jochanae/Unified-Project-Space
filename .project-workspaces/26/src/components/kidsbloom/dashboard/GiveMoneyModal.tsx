import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GiveMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  spendBalance: number;
  onSuccess?: () => void;
}

export const GiveMoneyModal = ({
  open,
  onOpenChange,
  kidId,
  variant,
  spendBalance,
  onSuccess,
}: GiveMoneyModalProps) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  const handleGive = async () => {
    const giveAmount = parseFloat(amount);
    if (isNaN(giveAmount) || giveAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (giveAmount > spendBalance) {
      toast.error(isPlayful ? "Not enough in Spend bucket! 💸" : "Insufficient spend balance");
      return;
    }

    setIsLoading(true);
    try {
      // Get current profile balances
      const { data: profile, error: profileFetchError } = await supabase
        .from("kids_profiles")
        .select("spend_balance, give_balance, current_balance")
        .eq("id", kidId)
        .single();

      if (profileFetchError || !profile) throw profileFetchError;

      // Move money from Spend bucket to Give bucket
      const { error: profileError } = await supabase
        .from("kids_profiles")
        .update({
          spend_balance: profile.spend_balance - giveAmount,
          give_balance: profile.give_balance + giveAmount,
          current_balance: profile.current_balance - giveAmount,
        })
        .eq("id", kidId);

      if (profileError) throw profileError;

      // Log the transaction
      const { error: transactionError } = await supabase
        .from("kid_transactions")
        .insert([{
          kid_id: kidId,
          amount: giveAmount,
          type: "savings" as const, // Use savings type for bucket transfers
          description: description || "Moved to Give bucket",
          category: "giving",
          bucket: "give",
        }]);

      if (transactionError) throw transactionError;

      toast.success(isPlayful ? "You're so generous! 💝✨" : `Moved $${giveAmount.toFixed(2)} to Give bucket`);
      
      onOpenChange(false);
      setAmount("");
      setDescription("");
      onSuccess?.();
    } catch (error) {
      console.error("Error moving to give:", error);
      toast.error("Failed to move money. Please try again.");
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
            ? "bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200"
            : "bg-background"
        }`}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-bold flex items-center gap-2 ${
              isPlayful ? "text-pink-600" : ""
            }`}
          >
            <Heart className="h-6 w-6" />
            {isPlayful ? "Share the Love! 💝" : "Move to Give"}
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
            <ArrowRight className={`h-6 w-6 ${isPlayful ? "text-pink-500" : "text-muted-foreground"}`} />
          </div>

          {/* To Give Bucket */}
          <div
            className={`p-3 rounded-xl text-center ${
              isPlayful ? "bg-pink-100" : "bg-muted"
            }`}
          >
            <p className={`text-xs ${isPlayful ? "text-pink-600" : "text-muted-foreground"}`}>
              {isPlayful ? "To Give Bucket 💝" : "To Give Bucket"}
            </p>
            <Heart className={`h-8 w-8 mx-auto mt-1 ${isPlayful ? "text-pink-500" : "text-pink-400"}`} />
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {quickAmounts.map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                onClick={() => setAmount(amt.toString())}
                disabled={amt > spendBalance}
                className={`flex-1 ${
                  isPlayful ? "border-pink-300 hover:bg-pink-100" : ""
                }`}
              >
                ${amt}
              </Button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-pink-600" : ""}>
              {isPlayful ? "How much to share?" : "Amount"}
            </Label>
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
                  isPlayful ? "border-pink-300 focus:ring-pink-500" : ""
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-pink-600" : ""}>
              {isPlayful ? "What's it for? (optional)" : "Note (optional)"}
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isPlayful ? "Helping others..." : "Add a note"}
              className={isPlayful ? "border-pink-300" : ""}
            />
          </div>

          <Button
            onClick={handleGive}
            disabled={
              isLoading ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > spendBalance
            }
            className={`w-full h-12 text-base font-bold ${
              isPlayful
                ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                : ""
            }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Heart className="h-5 w-5 mr-2" />
                {isPlayful ? "Share It! 💝" : "Move to Give"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
