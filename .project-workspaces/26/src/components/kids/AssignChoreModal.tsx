import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Users, User, Zap, X, Repeat, ListChecks, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssignChoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kidId: string;
  kidName: string;
  familyGroupId?: string;
  onSuccess: () => void;
}

const choreIcons = [
  { icon: "🧹", label: "Clean" },
  { icon: "🍽️", label: "Dishes" },
  { icon: "🛏️", label: "Bed" },
  { icon: "📚", label: "Homework" },
  { icon: "🐕", label: "Pet" },
  { icon: "🌱", label: "Plants" },
  { icon: "🧺", label: "Laundry" },
  { icon: "🗑️", label: "Trash" },
  { icon: "🚗", label: "Car" },
  { icon: "🏠", label: "Room" },
  { icon: "⭐", label: "Other" },
];

// Suggested chore templates with recommended amounts (based on common practices)
const choreTemplates = [
  { icon: "🛏️", title: "Make the bed", suggestedAmount: 0.50, recurring: "daily", description: "Make bed neatly with pillows" },
  { icon: "🧹", title: "Clean your room", suggestedAmount: 2.00, recurring: "weekly", description: "Pick up toys, vacuum, dust" },
  { icon: "🍽️", title: "Do the dishes", suggestedAmount: 1.00, recurring: "daily", description: "Load/unload dishwasher or hand wash" },
  { icon: "🗑️", title: "Take out trash", suggestedAmount: 0.75, recurring: "weekly", description: "Empty all trash cans" },
  { icon: "🐕", title: "Feed the pet", suggestedAmount: 0.50, recurring: "daily", description: "Feed and refill water bowl" },
  { icon: "🐕", title: "Walk the dog", suggestedAmount: 2.00, recurring: "daily", description: "15-20 minute walk" },
  { icon: "🧺", title: "Do laundry", suggestedAmount: 3.00, recurring: "weekly", description: "Wash, dry, fold clothes" },
  { icon: "🧺", title: "Fold & put away clothes", suggestedAmount: 1.50, recurring: "weekly", description: "Fold clean laundry neatly" },
  { icon: "🌱", title: "Water the plants", suggestedAmount: 0.50, recurring: "weekly", description: "Water all indoor/outdoor plants" },
  { icon: "🧹", title: "Vacuum the house", suggestedAmount: 2.50, recurring: "weekly", description: "Vacuum all rooms" },
  { icon: "🧹", title: "Mop the floors", suggestedAmount: 2.00, recurring: "weekly", description: "Mop kitchen and bathrooms" },
  { icon: "🍽️", title: "Set the table", suggestedAmount: 0.25, recurring: "daily", description: "Set table for dinner" },
  { icon: "🍽️", title: "Clear the table", suggestedAmount: 0.25, recurring: "daily", description: "Clear and wipe table after meals" },
  { icon: "📚", title: "Complete homework", suggestedAmount: 1.00, recurring: "daily", description: "Finish all homework assignments" },
  { icon: "📚", title: "Read for 30 minutes", suggestedAmount: 0.50, recurring: "daily", description: "Reading practice" },
  { icon: "🚗", title: "Help wash the car", suggestedAmount: 5.00, recurring: "monthly", description: "Help clean inside and out" },
  { icon: "🏠", title: "Organize closet", suggestedAmount: 3.00, recurring: "monthly", description: "Organize clothes and items" },
  { icon: "🧹", title: "Clean bathroom", suggestedAmount: 3.00, recurring: "weekly", description: "Wipe sink, toilet, mirror" },
  { icon: "🗑️", title: "Sort recycling", suggestedAmount: 0.50, recurring: "weekly", description: "Separate recyclables" },
  { icon: "🌱", title: "Yard work / Rake leaves", suggestedAmount: 5.00, recurring: "weekly", description: "Mow, rake, or weed garden" },
];

type ChoreType = "individual" | "family" | "bonus";

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export const AssignChoreModal = ({ 
  open, 
  onOpenChange, 
  kidId, 
  kidName,
  familyGroupId,
  onSuccess 
}: AssignChoreModalProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("⭐");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [choreType, setChoreType] = useState<ChoreType>("individual");
  const [isBonus, setIsBonus] = useState(false);
  
  // New: Recurring options
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("weekly");
  
  // New: Checklist/subtasks
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const [showTemplates, setShowTemplates] = useState(true);

  const applyTemplate = (template: typeof choreTemplates[0]) => {
    setTitle(template.title);
    setDescription(template.description);
    setReward(template.suggestedAmount.toString());
    setSelectedIcon(template.icon);
    setIsRecurring(template.recurring !== "monthly");
    setRecurrencePattern(template.recurring === "monthly" ? "weekly" : template.recurring);
    setShowTemplates(false);
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([
      ...checklist,
      { id: crypto.randomUUID(), title: newChecklistItem.trim(), completed: false }
    ]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a chore title");
      return;
    }

    if (choreType === "bonus" && !familyGroupId) {
      toast.error("Bonus chores require a family group");
      return;
    }

    setIsLoading(true);
    try {
      const choreData: any = {
        kid_id: kidId,
        assigned_by: user?.id,
        title: title.trim(),
        description: description.trim() || null,
        reward_amount: parseFloat(reward) || 0,
        icon: selectedIcon,
        due_date: dueDate?.toISOString().split("T")[0] || null,
        status: "pending",
        chore_type: choreType,
        is_bonus: isBonus || choreType === "bonus",
        is_group_visible: choreType !== "individual",
        is_recurring: isRecurring,
        recurrence_pattern: isRecurring ? recurrencePattern : null,
        checklist: checklist.length > 0 ? checklist : [],
      };

      // For bonus/family chores, add family group
      if (choreType !== "individual" && familyGroupId) {
        choreData.family_group_id = familyGroupId;
      }

      const { error } = await supabase
        .from("kid_chores")
        .insert(choreData);

      if (error) throw error;

      let successMsg = "";
      if (choreType === "bonus") {
        successMsg = "Bonus task created! First to claim wins! 🏆";
      } else if (isRecurring) {
        successMsg = `Recurring ${recurrencePattern} chore created! 🔄`;
      } else {
        successMsg = `Chore assigned to ${kidName}!`;
      }

      toast.success(successMsg);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error assigning chore:", error);
      toast.error("Failed to assign chore");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setReward("");
    setSelectedIcon("⭐");
    setDueDate(undefined);
    setChoreType("individual");
    setIsBonus(false);
    setIsRecurring(false);
    setRecurrencePattern("weekly");
    setChecklist([]);
    setNewChecklistItem("");
    setShowTemplates(true);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create Chore
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Quick Pick Templates */}
          {showTemplates && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Quick Pick (with suggested $)
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplates(false)}
                  className="text-xs h-7"
                >
                  Custom chore
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {choreTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="p-2 rounded-lg border border-muted bg-muted/30 hover:bg-primary/10 hover:border-primary/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{template.title}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            ${template.suggestedAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            • {template.recurring}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                💡 Tap a chore to auto-fill, or create a custom one
              </p>
            </div>
          )}
          {/* Chore Type Selector */}
          <div className="space-y-2">
            <Label>Chore Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setChoreType("individual"); setIsBonus(false); }}
                className={`
                  p-3 rounded-xl border-2 transition-all text-center
                  ${choreType === "individual" 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-muted-foreground/50"
                  }
                `}
              >
                <User className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                <span className="text-xs font-medium">Individual</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Just for {kidName}</p>
              </button>
              
              <button
                type="button"
                onClick={() => { setChoreType("family"); setIsBonus(false); }}
                disabled={!familyGroupId}
                className={`
                  p-3 rounded-xl border-2 transition-all text-center
                  ${choreType === "family" 
                    ? "border-primary bg-primary/10" 
                    : "border-muted hover:border-muted-foreground/50"
                  }
                  ${!familyGroupId ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <Users className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                <span className="text-xs font-medium">Family</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Visible to all</p>
              </button>
              
              <button
                type="button"
                onClick={() => { setChoreType("bonus"); setIsBonus(true); }}
                disabled={!familyGroupId}
                className={`
                  p-3 rounded-xl border-2 transition-all text-center
                  ${choreType === "bonus" 
                    ? "border-yellow-500 bg-yellow-500/10" 
                    : "border-muted hover:border-muted-foreground/50"
                  }
                  ${!familyGroupId ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                <Zap className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                <span className="text-xs font-medium">Bonus</span>
                <p className="text-[10px] text-muted-foreground mt-0.5">Grab first!</p>
              </button>
            </div>
            {!familyGroupId && (
              <p className="text-xs text-muted-foreground">
                Create a family group to enable family & bonus chores
              </p>
            )}
          </div>

          {/* Bonus Chore Info */}
          {choreType === "bonus" && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Grab First Challenge!
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    First kid to claim and complete this task wins the reward!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Choose an Icon</Label>
            <div className="flex flex-wrap gap-2">
              {choreIcons.map(({ icon }) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    text-2xl p-2 rounded-lg transition-all
                    ${selectedIcon === icon 
                      ? "bg-primary/20 ring-2 ring-primary scale-110" 
                      : "bg-muted hover:bg-muted/80"
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Chore Title *</Label>
            <Input
              placeholder="e.g., Clean your room"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              placeholder="Add any specific instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Checklist / Subtasks */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              Checklist (optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Add steps your child needs to complete
            </p>
            
            {/* Existing checklist items */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 bg-muted/50 rounded-lg p-2">
                {checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 bg-background rounded-lg px-2 py-1.5">
                    <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                    <span className="flex-1 text-sm">{item.title}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-red-500 hover:bg-red-100 rounded p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new item */}
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Make the bed"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addChecklistItem())}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Reward */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Reward Amount ($)
              {choreType === "bonus" && (
                <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded-full">
                  Bonus Reward
                </span>
              )}
            </Label>
            <Input
              type="number"
              placeholder="0.00"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              min="0"
              step="0.50"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-blue-500" />
                <div>
                  <Label className="text-sm">Recurring Chore</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically repeats on schedule
                  </p>
                </div>
              </div>
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            
            {isRecurring && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs">Repeat every:</Label>
                <Select value={recurrencePattern} onValueChange={setRecurrencePattern}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Extra Bonus Toggle (for non-bonus types) */}
          {choreType !== "bonus" && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-sm">Mark as Bonus Task</Label>
                <p className="text-xs text-muted-foreground">
                  Highlights this as an extra reward opportunity
                </p>
              </div>
              <Switch
                checked={isBonus}
                onCheckedChange={setIsBonus}
              />
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select a due date"}
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

          {/* Preview */}
          <div className={`p-3 rounded-lg ${choreType === "bonus" ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10" : "bg-muted"}`}>
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedIcon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{title || "Chore Title"}</p>
                  {(isBonus || choreType === "bonus") && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-600 px-1.5 py-0.5 rounded">
                      ⚡ Bonus
                    </span>
                  )}
                  {isRecurring && (
                    <span className="text-xs bg-blue-500/20 text-blue-600 px-1.5 py-0.5 rounded">
                      🔄 {recurrencePattern}
                    </span>
                  )}
                </div>
                {parseFloat(reward) > 0 && (
                  <p className="text-sm text-green-600 font-semibold">
                    Reward: ${parseFloat(reward).toFixed(2)}
                  </p>
                )}
                {checklist.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    📋 {checklist.length} step{checklist.length > 1 ? "s" : ""} to complete
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
            className={`w-full ${choreType === "bonus" ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600" : ""}`}
            size="lg"
          >
            {isLoading ? "Creating..." : choreType === "bonus" ? "Create Bonus Challenge 🏆" : "Assign Chore"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
