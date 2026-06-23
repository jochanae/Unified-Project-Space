import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddSavingsGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  onSuccess: () => void;
}

// Playful icons for younger kids
const playfulGoalIcons = [
  { icon: "🐷", label: "My Piggy Bank" },
  { icon: "💰", label: "Me Fund" },
  { icon: "🎮", label: "Game" },
  { icon: "🚲", label: "Bike" },
  { icon: "📱", label: "Phone" },
  { icon: "👟", label: "Shoes" },
  { icon: "🎸", label: "Music" },
  { icon: "🎨", label: "Art" },
  { icon: "🏀", label: "Sports" },
  { icon: "🧸", label: "Toy" },
  { icon: "✈️", label: "Travel" },
  { icon: "🎁", label: "Other" },
];

// Modern icons for teens - more mature/aspirational
const modernGoalIcons = [
  { icon: "💰", label: "Savings" },
  { icon: "🎮", label: "Gaming" },
  { icon: "📱", label: "Tech" },
  { icon: "👟", label: "Fashion" },
  { icon: "🎸", label: "Music" },
  { icon: "🚗", label: "Car" },
  { icon: "💻", label: "Laptop" },
  { icon: "🎧", label: "Audio" },
  { icon: "📸", label: "Camera" },
  { icon: "✈️", label: "Travel" },
  { icon: "🏋️", label: "Fitness" },
  { icon: "🎓", label: "Education" },
];

export const AddSavingsGoalModal = ({ open, onOpenChange, kidId, variant, onSuccess }: AddSavingsGoalModalProps) => {
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🎁");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a goal name");
      return;
    }
    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("kid_savings_goals")
        .insert({
          kid_id: kidId,
          title: title.trim(),
          target_amount: amount,
          icon: selectedIcon,
        });

      if (error) throw error;

      toast.success(isPlayful ? "Goal set! Start saving! 🌟" : "Goal created");
      onOpenChange(false);
      setTitle("");
      setTargetAmount("");
      setSelectedIcon("🎁");
      onSuccess();
    } catch (error: any) {
      console.error("Error adding goal:", error);
      toast.error("Failed to add goal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlayful ? "bg-gradient-to-b from-blue-50 to-purple-50" : "bg-slate-900 border-emerald-500/30 text-white"}>
        <DialogHeader>
          <DialogTitle className={isPlayful ? "text-purple-600 text-center" : "text-white text-center"}>
            {isPlayful ? "New Savings Goal! 🎯" : "Create Savings Goal"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-purple-600" : "text-white"}>
              {isPlayful ? "What are you saving for?" : "Icon"}
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {(isPlayful ? playfulGoalIcons : modernGoalIcons).map((item) => (
                <motion.button
                  key={item.icon}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(item.icon)}
                  className={`
                    p-2 rounded-xl text-2xl transition-all
                    ${selectedIcon === item.icon
                      ? isPlayful
                        ? "bg-purple-500 ring-2 ring-purple-300"
                        : "bg-emerald-500 ring-2 ring-emerald-300"
                      : isPlayful
                        ? "bg-white hover:bg-purple-100"
                        : "bg-white/10 hover:bg-white/20"
                    }
                  `}
                >
                  {item.icon}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-purple-600" : "text-white"}>
              {isPlayful ? "Name your goal:" : "Goal Name"}
            </Label>
            <Input
              placeholder={isPlayful ? "New bike, video game..." : "Enter goal name"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={isPlayful ? "border-purple-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-purple-600" : "text-white"}>
              {isPlayful ? "How much do you need?" : "Target Amount ($)"}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className={`text-2xl text-center font-bold ${isPlayful ? "border-purple-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !targetAmount || isLoading}
            className={`w-full h-12 text-lg ${isPlayful ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Creating..." : isPlayful ? "Set Goal! 🚀" : "Create Goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
