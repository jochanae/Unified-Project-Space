import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles, Plus, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyGroupId?: string;
  onSuccess: () => void;
}

interface TaskTemplate {
  title: string;
  suggestedReward: number;
  recurring: string;
  category: string;
}

interface SelectedTask extends TaskTemplate {
  includeReward: boolean;
  customReward: number;
}

// Comprehensive task templates organized by category
const taskTemplates: Record<string, TaskTemplate[]> = {
  "Daily Essentials": [
    { title: "Make the bed", suggestedReward: 0.50, recurring: "daily", category: "bedroom" },
    { title: "Brush teeth (morning)", suggestedReward: 0, recurring: "daily", category: "hygiene" },
    { title: "Brush teeth (night)", suggestedReward: 0, recurring: "daily", category: "hygiene" },
    { title: "Get dressed", suggestedReward: 0, recurring: "daily", category: "hygiene" },
    { title: "Pack school bag", suggestedReward: 0, recurring: "daily", category: "school" },
  ],
  "Kitchen & Meals": [
    { title: "Set the table", suggestedReward: 0.25, recurring: "daily", category: "kitchen" },
    { title: "Clear the table", suggestedReward: 0.25, recurring: "daily", category: "kitchen" },
    { title: "Do the dishes", suggestedReward: 1.00, recurring: "daily", category: "kitchen" },
    { title: "Load dishwasher", suggestedReward: 0.75, recurring: "daily", category: "kitchen" },
    { title: "Unload dishwasher", suggestedReward: 0.75, recurring: "daily", category: "kitchen" },
    { title: "Wipe down counters", suggestedReward: 0.50, recurring: "daily", category: "kitchen" },
    { title: "Help with cooking", suggestedReward: 1.00, recurring: "daily", category: "kitchen" },
    { title: "Pack lunch", suggestedReward: 0.50, recurring: "daily", category: "kitchen" },
  ],
  "Cleaning & Organization": [
    { title: "Clean your room", suggestedReward: 2.00, recurring: "weekly", category: "bedroom" },
    { title: "Vacuum floors", suggestedReward: 2.50, recurring: "weekly", category: "cleaning" },
    { title: "Mop floors", suggestedReward: 2.00, recurring: "weekly", category: "cleaning" },
    { title: "Dust furniture", suggestedReward: 1.50, recurring: "weekly", category: "cleaning" },
    { title: "Clean bathroom", suggestedReward: 3.00, recurring: "weekly", category: "cleaning" },
    { title: "Clean mirrors", suggestedReward: 1.00, recurring: "weekly", category: "cleaning" },
    { title: "Organize closet", suggestedReward: 3.00, recurring: "monthly", category: "bedroom" },
    { title: "Declutter room", suggestedReward: 2.00, recurring: "monthly", category: "bedroom" },
  ],
  "Laundry": [
    { title: "Put dirty clothes in hamper", suggestedReward: 0, recurring: "daily", category: "laundry" },
    { title: "Sort laundry", suggestedReward: 0.50, recurring: "weekly", category: "laundry" },
    { title: "Start laundry (washer)", suggestedReward: 0.50, recurring: "weekly", category: "laundry" },
    { title: "Move laundry to dryer", suggestedReward: 0.50, recurring: "weekly", category: "laundry" },
    { title: "Fold clothes", suggestedReward: 1.50, recurring: "weekly", category: "laundry" },
    { title: "Put away clothes", suggestedReward: 1.00, recurring: "weekly", category: "laundry" },
    { title: "Iron clothes", suggestedReward: 2.00, recurring: "weekly", category: "laundry" },
  ],
  "Trash & Recycling": [
    { title: "Take out trash", suggestedReward: 0.75, recurring: "weekly", category: "general" },
    { title: "Empty small trash cans", suggestedReward: 0.50, recurring: "weekly", category: "general" },
    { title: "Sort recycling", suggestedReward: 0.50, recurring: "weekly", category: "general" },
    { title: "Take recycling to curb", suggestedReward: 0.75, recurring: "weekly", category: "general" },
  ],
  "Pets": [
    { title: "Feed the pet", suggestedReward: 0.50, recurring: "daily", category: "pets" },
    { title: "Give pet fresh water", suggestedReward: 0.25, recurring: "daily", category: "pets" },
    { title: "Walk the dog", suggestedReward: 2.00, recurring: "daily", category: "pets" },
    { title: "Clean litter box", suggestedReward: 1.50, recurring: "daily", category: "pets" },
    { title: "Brush pet", suggestedReward: 1.00, recurring: "weekly", category: "pets" },
    { title: "Clean pet cage/tank", suggestedReward: 2.00, recurring: "weekly", category: "pets" },
  ],
  "Outdoor & Yard": [
    { title: "Water plants", suggestedReward: 0.50, recurring: "weekly", category: "outdoor" },
    { title: "Pull weeds", suggestedReward: 2.00, recurring: "weekly", category: "outdoor" },
    { title: "Rake leaves", suggestedReward: 3.00, recurring: "weekly", category: "outdoor" },
    { title: "Mow lawn", suggestedReward: 5.00, recurring: "weekly", category: "outdoor" },
    { title: "Sweep porch/patio", suggestedReward: 1.50, recurring: "weekly", category: "outdoor" },
    { title: "Wash the car", suggestedReward: 5.00, recurring: "monthly", category: "outdoor" },
    { title: "Shovel snow", suggestedReward: 5.00, recurring: "weekly", category: "outdoor" },
  ],
  "School & Homework": [
    { title: "Complete homework", suggestedReward: 1.00, recurring: "daily", category: "school" },
    { title: "Read for 30 minutes", suggestedReward: 0.50, recurring: "daily", category: "school" },
    { title: "Practice instrument", suggestedReward: 1.00, recurring: "daily", category: "school" },
    { title: "Study for test", suggestedReward: 1.00, recurring: "daily", category: "school" },
    { title: "Organize school papers", suggestedReward: 0.50, recurring: "weekly", category: "school" },
  ],
  "Groceries & Errands": [
    { title: "Help with groceries", suggestedReward: 2.00, recurring: "weekly", category: "general" },
    { title: "Put groceries away", suggestedReward: 1.00, recurring: "weekly", category: "general" },
    { title: "Get the mail", suggestedReward: 0.25, recurring: "daily", category: "general" },
  ],
};

export const QuickSetupModal = ({ open, onOpenChange, familyGroupId, onSuccess }: QuickSetupModalProps) => {
  const { user } = useAuth();
  const [selectedTasks, setSelectedTasks] = useState<Map<string, SelectedTask>>(new Map());
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(taskTemplates)));

  const toggleTask = (task: TaskTemplate) => {
    const key = task.title;
    const newSelected = new Map(selectedTasks);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, {
        ...task,
        includeReward: task.suggestedReward > 0,
        customReward: task.suggestedReward,
      });
    }
    setSelectedTasks(newSelected);
  };

  const toggleReward = (taskTitle: string) => {
    const task = selectedTasks.get(taskTitle);
    if (!task) return;
    
    const newSelected = new Map(selectedTasks);
    newSelected.set(taskTitle, {
      ...task,
      includeReward: !task.includeReward,
    });
    setSelectedTasks(newSelected);
  };

  const updateReward = (taskTitle: string, amount: number) => {
    const task = selectedTasks.get(taskTitle);
    if (!task) return;
    
    const newSelected = new Map(selectedTasks);
    newSelected.set(taskTitle, {
      ...task,
      customReward: amount,
    });
    setSelectedTasks(newSelected);
  };

  const addCustomTask = () => {
    if (!customTaskTitle.trim()) return;
    
    const task: SelectedTask = {
      title: customTaskTitle.trim(),
      suggestedReward: 0,
      recurring: "weekly",
      category: "custom",
      includeReward: false,
      customReward: 0,
    };
    
    const newSelected = new Map(selectedTasks);
    newSelected.set(task.title, task);
    setSelectedTasks(newSelected);
    setCustomTaskTitle("");
  };

  const selectAllInCategory = (category: string) => {
    const tasks = taskTemplates[category];
    const newSelected = new Map(selectedTasks);
    
    tasks.forEach(task => {
      if (!newSelected.has(task.title)) {
        newSelected.set(task.title, {
          ...task,
          includeReward: task.suggestedReward > 0,
          customReward: task.suggestedReward,
        });
      }
    });
    setSelectedTasks(newSelected);
  };

  const handleSubmit = async () => {
    if (!user || selectedTasks.size === 0) {
      toast.error("Please select at least one task");
      return;
    }

    setIsLoading(true);
    try {
      const tasksToInsert = Array.from(selectedTasks.values()).map(task => ({
        user_id: user.id,
        family_group_id: familyGroupId || null,
        title: task.title,
        default_reward: task.includeReward ? task.customReward : 0,
        category: task.category,
        is_recurring: task.recurring !== "one-time",
        recurrence_pattern: task.recurring,
      }));

      const { error } = await supabase
        .from("household_tasks")
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success(`Added ${selectedTasks.size} tasks to your household!`);
      setSelectedTasks(new Map());
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating tasks:", error);
      toast.error("Failed to create tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelected = selectedTasks.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Quick Setup - Select Your Household Tasks
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Check tasks you want to track. Toggle $ to include rewards.
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Custom Task Input */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Add Custom Task</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Practice piano"
                  value={customTaskTitle}
                  onChange={(e) => setCustomTaskTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addCustomTask()}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addCustomTask}
                  disabled={!customTaskTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Task Categories */}
            {Object.entries(taskTemplates).map(([category, tasks]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{category}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectAllInCategory(category)}
                    className="text-xs h-7"
                  >
                    Select all
                  </Button>
                </div>
                <div className="space-y-1">
                  {tasks.map(task => {
                    const selected = selectedTasks.get(task.title);
                    const isSelected = !!selected;
                    
                    return (
                      <div
                        key={task.title}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg border transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                        )}
                      >
                        {/* Checkbox */}
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTask(task)}
                        />
                        
                        {/* Task Title */}
                        <span className={cn(
                          "flex-1 text-sm",
                          isSelected ? "font-medium" : ""
                        )}>
                          {task.title}
                        </span>
                        
                        {/* Frequency Badge */}
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {task.recurring}
                        </Badge>
                        
                        {/* Reward Toggle & Amount */}
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleReward(task.title)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-all",
                                selected?.includeReward 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <DollarSign className="h-3 w-3" />
                              {selected?.includeReward ? "On" : "Off"}
                            </button>
                            
                            {selected?.includeReward && (
                              <Input
                                type="number"
                                value={selected.customReward}
                                onChange={(e) => updateReward(task.title, parseFloat(e.target.value) || 0)}
                                className="w-16 h-7 text-xs text-center"
                                min="0"
                                step="0.25"
                              />
                            )}
                          </div>
                        )}
                        
                        {/* Suggested amount hint (when not selected) */}
                        {!isSelected && task.suggestedReward > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            ~${task.suggestedReward.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Show custom tasks */}
            {Array.from(selectedTasks.values()).filter(t => t.category === "custom").length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Custom Tasks</p>
                <div className="space-y-1">
                  {Array.from(selectedTasks.values())
                    .filter(t => t.category === "custom")
                    .map(task => (
                      <div
                        key={task.title}
                        className="flex items-center gap-3 p-2 rounded-lg border border-primary bg-primary/5"
                      >
                        <Checkbox checked onCheckedChange={() => toggleTask(task)} />
                        <span className="flex-1 text-sm font-medium">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleReward(task.title)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded text-xs transition-all",
                              task.includeReward 
                                ? "bg-emerald-100 text-emerald-700" 
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            <DollarSign className="h-3 w-3" />
                            {task.includeReward ? "On" : "Off"}
                          </button>
                          {task.includeReward && (
                            <Input
                              type="number"
                              value={task.customReward}
                              onChange={(e) => updateReward(task.title, parseFloat(e.target.value) || 0)}
                              className="w-16 h-7 text-xs text-center"
                              min="0"
                              step="0.25"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{totalSelected} tasks selected</p>
              <p className="text-xs text-muted-foreground">
                {Array.from(selectedTasks.values()).filter(t => t.includeReward).length} with rewards
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading || totalSelected === 0}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                {isLoading ? "Adding..." : `Add ${totalSelected} Tasks`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
