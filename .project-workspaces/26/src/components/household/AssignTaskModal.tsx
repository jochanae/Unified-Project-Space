import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CalendarIcon, Users, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AssignableMember {
  id: string;
  name: string;
  type: "kid" | "adult";
  avatar?: string;
}

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    default_reward: number;
  };
  assignableMembers: AssignableMember[];
  onSuccess: () => void;
}

export const AssignTaskModal = ({ 
  open, 
  onOpenChange, 
  task, 
  assignableMembers,
  onSuccess 
}: AssignTaskModalProps) => {
  const { user } = useAuth();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [rewardAmount, setRewardAmount] = useState(task.default_reward.toString());
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAssign = async () => {
    if (!user || selectedMembers.length === 0) {
      toast.error("Please select at least one person");
      return;
    }

    setIsLoading(true);
    try {
      const assignments = selectedMembers.map(memberId => {
        const member = assignableMembers.find(m => m.id === memberId);
        return {
          task_id: task.id,
          assigned_by: user.id,
          assigned_to_kid_id: member?.type === "kid" ? memberId : null,
          assigned_to_user_id: member?.type === "adult" ? memberId : null,
          reward_amount: parseFloat(rewardAmount) || 0,
          due_date: dueDate?.toISOString().split("T")[0] || null,
          status: "pending",
        };
      });

      // Insert into household_task_assignments
      const { error } = await supabase
        .from("household_task_assignments")
        .insert(assignments);

      if (error) throw error;

      // Also create kid_chores for kids so it shows up in their dashboard
      const kidAssignments = selectedMembers
        .map(memberId => assignableMembers.find(m => m.id === memberId))
        .filter(member => member?.type === "kid");

      if (kidAssignments.length > 0) {
        const kidChores = kidAssignments.map(member => ({
          kid_id: member!.id,
          assigned_by: user.id,
          title: task.title,
          reward_amount: parseFloat(rewardAmount) || 0,
          due_date: dueDate?.toISOString().split("T")[0] || null,
          status: "pending" as const,
          chore_type: "assigned",
        }));

        const { error: choreError } = await supabase
          .from("kid_chores")
          .insert(kidChores);

        if (choreError) {
          console.error("Error creating kid chores:", choreError);
          // Don't fail the whole operation, household assignment succeeded
        }
      }

      toast.success(
        selectedMembers.length === 1 
          ? "Task assigned!" 
          : `Task assigned to ${selectedMembers.length} people!`
      );
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error assigning task:", error);
      toast.error("Failed to assign task");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedMembers([]);
    setRewardAmount(task.default_reward.toString());
    setDueDate(undefined);
  };

  const selectAll = () => {
    setSelectedMembers(assignableMembers.map(m => m.id));
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Task Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium text-sm">{task.title}</p>
            {task.default_reward > 0 && (
              <p className="text-xs text-muted-foreground">
                Default reward: ${task.default_reward.toFixed(2)}
              </p>
            )}
          </div>

          {/* Member Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Assign to</Label>
              {assignableMembers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs h-7"
                >
                  Select all
                </Button>
              )}
            </div>
            
            {assignableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No family members to assign to
              </p>
            ) : (
              <div className="space-y-1.5">
                {assignableMembers.map(member => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      selectedMembers.includes(member.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center",
                      selectedMembers.includes(member.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    )}>
                      {selectedMembers.includes(member.id) && (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                    <span className="text-lg">{member.avatar || "👤"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {member.type}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reward Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm">Reward Amount ($)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              min="0"
              step="0.25"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave at 0 for no reward
            </p>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label className="text-sm">Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isLoading || selectedMembers.length === 0}
              className="flex-1"
            >
              {isLoading ? "Assigning..." : `Assign${selectedMembers.length > 1 ? ` (${selectedMembers.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
