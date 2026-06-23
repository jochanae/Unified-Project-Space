import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Target, CalendarIcon, Users, Lock, Crown } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type GoalType = Database["public"]["Enums"]["goal_type"];

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const goalTypes: { value: GoalType; label: string; emoji: string; description: string; premium: boolean }[] = [
  { value: "individual", label: "Individual", emoji: "🎯", description: "Personal savings goal", premium: false },
  { value: "joint", label: "Joint", emoji: "👫", description: "Save with a partner", premium: true },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧‍👦", description: "Family savings goal", premium: true },
  { value: "friends", label: "Friends", emoji: "👥", description: "Save with friends", premium: true },
  { value: "business", label: "Business", emoji: "💼", description: "Business or team goal", premium: true },
  { value: "community", label: "Community", emoji: "🌍", description: "Community fundraising", premium: true },
];

const CreateGoalModal = ({ open, onOpenChange, onSuccess }: CreateGoalModalProps) => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"type" | "details">("type");
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("individual");
  const [deadline, setDeadline] = useState<Date | undefined>();

  // Check if user has premium subscription
  const isPremium = subscribed;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTargetAmount("");
    setGoalType("individual");
    setDeadline(undefined);
    setStep("type");
  };

  const handleCreate = async (addAnother: boolean = false) => {
    if (!user) {
      toast.error("Please sign in to create a goal");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("goals")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          target_amount: Number(targetAmount),
          goal_type: goalType,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from("goal_activity").insert({
        goal_id: data.id,
        user_id: user.id,
        activity_type: "goal_created",
        description: `Created goal "${title}"`,
      });

      toast.success("Goal created successfully!");
      resetForm();
      if (addAnother) {
        setStep("type"); // Go back to type selection for next goal
      } else {
        onOpenChange(false);
      }
      onSuccess?.();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {step === "type" ? "Choose Goal Type" : "Goal Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "type" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select the type of savings goal you want to create
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {goalTypes.map((type) => {
                const isDisabled = type.premium && !isPremium;
                return (
                  <button
                    key={type.value}
                    onClick={() => {
                      if (!isDisabled) {
                        setGoalType(type.value);
                        setStep("details");
                      }
                    }}
                    disabled={isDisabled}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all",
                      goalType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                      isDisabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {type.premium && (
                      <Badge 
                        className="absolute -top-2 -right-2 text-xs"
                        variant={isPremium ? "secondary" : "default"}
                      >
                        <Crown className="h-3 w-3 mr-1" />
                        Pro
                      </Badge>
                    )}
                    <span className="text-2xl mb-2 block">{type.emoji}</span>
                    <p className="font-semibold text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                    {type.value !== "individual" && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Collaborative
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!isPremium && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>
                    <span className="font-semibold">Upgrade to Premium</span> to create collaborative goals
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setStep("type")}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              ← Change goal type
            </button>

            <div className="p-3 rounded-lg bg-muted flex items-center gap-3">
              <span className="text-2xl">
                {goalTypes.find((t) => t.value === goalType)?.emoji}
              </span>
              <div>
                <p className="font-semibold text-sm capitalize">{goalType} Goal</p>
                <p className="text-xs text-muted-foreground">
                  {goalTypes.find((t) => t.value === goalType)?.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Goal Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Emergency Fund, Vacation, New Car"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add details about your savings goal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="target"
                  type="number"
                  placeholder="10,000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-7"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Target Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Pick a deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { resetForm(); onOpenChange(false); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreate(false)}
                  disabled={loading || !title.trim() || !targetAmount}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600"
                >
                  {loading ? "Creating..." : "Create Goal"}
                </Button>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleCreate(true)}
                disabled={loading || !title.trim() || !targetAmount}
                className="w-full"
              >
                {loading ? "Creating..." : "Save & Add Another"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateGoalModal;
