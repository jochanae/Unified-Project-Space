import { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddChoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  variant: "playful" | "modern";
  onSuccess: () => void;
}

const choreIcons = [
  { icon: "🧹", label: "Clean" },
  { icon: "🛏️", label: "Bed" },
  { icon: "🍽️", label: "Dishes" },
  { icon: "🐕", label: "Pet" },
  { icon: "📚", label: "Homework" },
  { icon: "🧺", label: "Laundry" },
  { icon: "🌱", label: "Garden" },
  { icon: "🚗", label: "Car" },
  { icon: "🗑️", label: "Trash" },
  { icon: "⭐", label: "Other" },
];

export const AddChoreModal = ({ open, onOpenChange, kidId, variant, onSuccess }: AddChoreModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("⭐");
  const [isLoading, setIsLoading] = useState(false);
  const isPlayful = variant === "playful";

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task name");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("kid_chores")
        .insert({
          kid_id: kidId,
          title: title.trim(),
          description: description.trim() || null,
          reward_amount: parseFloat(reward) || 0,
          icon: selectedIcon,
          status: "pending",
        });

      if (error) throw error;

      toast.success(isPlayful ? "Chore added! Time to earn! 🌟" : "Task added");
      onOpenChange(false);
      setTitle("");
      setDescription("");
      setReward("");
      setSelectedIcon("⭐");
      onSuccess();
    } catch (error: any) {
      console.error("Error adding chore:", error);
      toast.error("Failed to add chore");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isPlayful ? "bg-gradient-to-b from-yellow-50 to-orange-50" : "bg-slate-900 border-emerald-500/30 text-white"}>
        <DialogHeader>
          <DialogTitle className={isPlayful ? "text-orange-600 text-center" : "text-white text-center"}>
            {isPlayful ? "New Chore! ✨" : "Add Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-orange-600" : "text-white"}>
              {isPlayful ? "Pick an icon:" : "Icon"}
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {choreIcons.map((item) => (
                <motion.button
                  key={item.icon}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedIcon(item.icon)}
                  className={`
                    p-2 rounded-xl text-2xl transition-all
                    ${selectedIcon === item.icon
                      ? isPlayful
                        ? "bg-orange-500 ring-2 ring-orange-300"
                        : "bg-emerald-500 ring-2 ring-emerald-300"
                      : isPlayful
                        ? "bg-white hover:bg-orange-100"
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
            <Label className={isPlayful ? "text-orange-600" : "text-white"}>
              {isPlayful ? "What needs to be done?" : "Task Name"}
            </Label>
            <Input
              placeholder={isPlayful ? "Make my bed, feed the cat..." : "Enter task name"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={isPlayful ? "border-orange-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-orange-600" : "text-white"}>
              {isPlayful ? "More details (optional)" : "Description (optional)"}
            </Label>
            <Textarea
              placeholder={isPlayful ? "Any special instructions?" : "Enter description"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={isPlayful ? "border-orange-200" : "bg-white/10 border-white/20 text-white placeholder:text-white/50"}
              rows={2}
            />
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label className={isPlayful ? "text-orange-600" : "text-white"}>
              {isPlayful ? "Reward (coins):" : "Reward Amount ($)"}
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              className={`text-center font-bold ${isPlayful ? "border-orange-200" : "bg-white/10 border-white/20 text-white"}`}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
            className={`w-full h-12 text-lg ${isPlayful ? "bg-gradient-to-r from-orange-500 to-yellow-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Adding..." : isPlayful ? "Add Chore! 🌟" : "Add Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
