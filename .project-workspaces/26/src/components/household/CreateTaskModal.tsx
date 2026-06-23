import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Sparkles, Check, ArrowLeft, ArrowRight, DollarSign, X, Trash2, Pencil, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyGroupId?: string;
  onSuccess: () => void;
}

interface TaskTemplate {
  id?: string;
  title: string;
  reward: number;
  recurring: string;
  category: string;
  isDefault?: boolean;
}

interface SelectedTask {
  title: string;
  reward: number;
  recurring: string;
  category: string;
  rewardEnabled: boolean;
  isCustom?: boolean;
}

// Default task templates
const defaultTemplates: TaskTemplate[] = [
  { title: "Make the bed", reward: 0.50, recurring: "daily", category: "bedroom", isDefault: true },
  { title: "Clean your room", reward: 2.00, recurring: "weekly", category: "bedroom", isDefault: true },
  { title: "Do the dishes", reward: 1.00, recurring: "daily", category: "kitchen", isDefault: true },
  { title: "Take out trash", reward: 0.75, recurring: "weekly", category: "general", isDefault: true },
  { title: "Feed the pet", reward: 0.50, recurring: "daily", category: "pets", isDefault: true },
  { title: "Walk the dog", reward: 2.00, recurring: "daily", category: "pets", isDefault: true },
  { title: "Do laundry", reward: 3.00, recurring: "weekly", category: "laundry", isDefault: true },
  { title: "Fold clothes", reward: 1.50, recurring: "weekly", category: "laundry", isDefault: true },
  { title: "Water plants", reward: 0.50, recurring: "weekly", category: "general", isDefault: true },
  { title: "Vacuum floors", reward: 2.50, recurring: "weekly", category: "cleaning", isDefault: true },
  { title: "Mop floors", reward: 2.00, recurring: "weekly", category: "cleaning", isDefault: true },
  { title: "Set the table", reward: 0.25, recurring: "daily", category: "kitchen", isDefault: true },
  { title: "Clear the table", reward: 0.25, recurring: "daily", category: "kitchen", isDefault: true },
  { title: "Complete homework", reward: 1.00, recurring: "daily", category: "school", isDefault: true },
  { title: "Read for 30 min", reward: 0.50, recurring: "daily", category: "school", isDefault: true },
  { title: "Clean bathroom", reward: 3.00, recurring: "weekly", category: "cleaning", isDefault: true },
  { title: "Yard work", reward: 5.00, recurring: "weekly", category: "outdoor", isDefault: true },
  { title: "Help with groceries", reward: 2.00, recurring: "weekly", category: "general", isDefault: true },
  { title: "Organize closet", reward: 3.00, recurring: "monthly", category: "bedroom", isDefault: true },
  { title: "Wash the car", reward: 5.00, recurring: "monthly", category: "outdoor", isDefault: true },
];

const categories = ["general", "kitchen", "bedroom", "cleaning", "laundry", "outdoor", "pets", "school"];
const frequencies = ["daily", "weekly", "biweekly", "monthly"];

export const CreateTaskModal = ({ open, onOpenChange, familyGroupId, onSuccess }: CreateTaskModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "review">("select");
  const [editMode, setEditMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userTemplates, setUserTemplates] = useState<TaskTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [newTemplateForm, setNewTemplateForm] = useState({ title: "", reward: "1.00", recurring: "weekly", category: "general" });

  // Combined templates: user's custom first, then defaults
  const allTemplates = [...userTemplates, ...defaultTemplates.filter(d => !userTemplates.some(u => u.title.toLowerCase() === d.title.toLowerCase()))];

  useEffect(() => {
    if (open && user) {
      fetchUserTemplates();
    }
  }, [open, user]);

  const fetchUserTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_task_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");
    
    if (data) {
      setUserTemplates(data.map(t => ({
        id: t.id,
        title: t.title,
        reward: Number(t.default_reward),
        recurring: t.recurring,
        category: t.category,
      })));
    }
  };

  const toggleTask = (template: TaskTemplate) => {
    if (editMode) return;
    const existingIndex = selectedTasks.findIndex(t => t.title === template.title);
    if (existingIndex >= 0) {
      setSelectedTasks(prev => prev.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedTasks(prev => [...prev, {
        ...template,
        rewardEnabled: true,
      }]);
    }
  };

  const isSelected = (title: string) => selectedTasks.some(t => t.title === title);

  const addCustomTask = () => {
    if (!customTaskTitle.trim()) return;
    if (selectedTasks.some(t => t.title.toLowerCase() === customTaskTitle.toLowerCase())) {
      toast.error("Task already added");
      return;
    }
    setSelectedTasks(prev => [...prev, {
      title: customTaskTitle.trim(),
      reward: 1.00,
      recurring: "weekly",
      category: "general",
      rewardEnabled: true,
      isCustom: true,
    }]);
    setCustomTaskTitle("");
  };

  const updateTask = (index: number, updates: Partial<SelectedTask>) => {
    setSelectedTasks(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const removeTask = (index: number) => {
    setSelectedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const saveNewTemplate = async () => {
    if (!user || !newTemplateForm.title.trim()) return;
    
    try {
      const { error } = await supabase
        .from("user_task_templates")
        .insert({
          user_id: user.id,
          title: newTemplateForm.title.trim(),
          default_reward: parseFloat(newTemplateForm.reward) || 1,
          recurring: newTemplateForm.recurring,
          category: newTemplateForm.category,
          display_order: userTemplates.length,
        });

      if (error) throw error;
      toast.success("Template saved!");
      setNewTemplateForm({ title: "", reward: "1.00", recurring: "weekly", category: "general" });
      fetchUserTemplates();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save template");
    }
  };

  const updateTemplate = async (template: TaskTemplate) => {
    if (!template.id) return;
    
    try {
      const { error } = await supabase
        .from("user_task_templates")
        .update({
          title: template.title,
          default_reward: template.reward,
          recurring: template.recurring,
          category: template.category,
        })
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Template updated!");
      setEditingTemplate(null);
      fetchUserTemplates();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update template");
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("user_task_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      toast.success("Template deleted!");
      fetchUserTemplates();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete template");
    }
  };

  const saveDefaultAsCustom = async (template: TaskTemplate) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("user_task_templates")
        .insert({
          user_id: user.id,
          title: template.title,
          default_reward: template.reward,
          recurring: template.recurring,
          category: template.category,
          display_order: userTemplates.length,
        });

      if (error) throw error;
      toast.success("Saved to your templates - you can now edit it!");
      fetchUserTemplates();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save template");
    }
  };

  const handleSubmit = async () => {
    if (!user || selectedTasks.length === 0) return;

    setIsLoading(true);
    try {
      const tasksToInsert = selectedTasks.map(task => ({
        user_id: user.id,
        family_group_id: familyGroupId || null,
        title: task.title,
        default_reward: task.rewardEnabled ? task.reward : 0,
        category: task.category,
        is_recurring: task.recurring !== "once",
        recurrence_pattern: task.recurring,
        rotation_enabled: false,
      }));

      const { error } = await supabase
        .from("household_tasks")
        .insert(tasksToInsert);

      if (error) throw error;

      toast.success(`${selectedTasks.length} task(s) added!`);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating tasks:", error);
      toast.error("Failed to create tasks");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("select");
    setSelectedTasks([]);
    setCustomTaskTitle("");
    setEditMode(false);
    setEditingTemplate(null);
  };

  const totalReward = selectedTasks.reduce((sum, t) => sum + (t.rewardEnabled ? t.reward : 0), 0);
  const tasksWithReward = selectedTasks.filter(t => t.rewardEnabled).length;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "review" && (
              <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={() => setStep("select")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Plus className="h-5 w-5" />
            {editMode ? "Edit Templates" : step === "select" ? "Select Tasks" : "Review & Add"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Edit Mode Toggle */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <Label className="text-xs text-muted-foreground">
                {editMode ? "Customize your template tiles" : "Select tasks to add"}
              </Label>
              <Button 
                variant={editMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => setEditMode(!editMode)}
                className="h-7 text-xs gap-1"
              >
                <Pencil className="h-3 w-3" />
                {editMode ? "Done Editing" : "Edit Tiles"}
              </Button>
            </div>

            {editMode ? (
              /* Edit Mode UI */
              <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
                {/* Add New Template */}
                <div className="p-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 space-y-2">
                  <Label className="text-xs font-medium">Add New Template Tile</Label>
                  <Input
                    placeholder="Task name"
                    value={newTemplateForm.title}
                    onChange={(e) => setNewTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                    className="h-8"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">Reward</Label>
                      <Input
                        type="number"
                        value={newTemplateForm.reward}
                        onChange={(e) => setNewTemplateForm(prev => ({ ...prev, reward: e.target.value }))}
                        className="h-7 text-xs"
                        min="0"
                        step="0.25"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Frequency</Label>
                      <Select value={newTemplateForm.recurring} onValueChange={(v) => setNewTemplateForm(prev => ({ ...prev, recurring: v }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Category</Label>
                      <Select value={newTemplateForm.category} onValueChange={(v) => setNewTemplateForm(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" onClick={saveNewTemplate} disabled={!newTemplateForm.title.trim()} className="w-full h-8">
                    <Plus className="h-3 w-3 mr-1" /> Save Template
                  </Button>
                </div>

                {/* Your Custom Templates */}
                {userTemplates.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Your Templates (editable)</Label>
                    <div className="space-y-2">
                      {userTemplates.map(template => (
                        <div key={template.id} className="p-2.5 rounded-lg border bg-primary/5 border-primary/30">
                          {editingTemplate?.id === template.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editingTemplate.title}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                                className="h-7 text-xs"
                              />
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  type="number"
                                  value={editingTemplate.reward}
                                  onChange={(e) => setEditingTemplate({ ...editingTemplate, reward: parseFloat(e.target.value) || 0 })}
                                  className="h-7 text-xs"
                                />
                                <Select value={editingTemplate.recurring} onValueChange={(v) => setEditingTemplate({ ...editingTemplate, recurring: v })}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Select value={editingTemplate.category} onValueChange={(v) => setEditingTemplate({ ...editingTemplate, category: v })}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingTemplate(null)} className="flex-1 h-7">Cancel</Button>
                                <Button size="sm" onClick={() => updateTemplate(editingTemplate)} className="flex-1 h-7">
                                  <Save className="h-3 w-3 mr-1" /> Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium">{template.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  ${template.reward.toFixed(2)} • {template.recurring}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingTemplate(template)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteTemplate(template.id!)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Default Templates */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Default Templates (tap to save & make editable)
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {defaultTemplates.filter(d => !userTemplates.some(u => u.title.toLowerCase() === d.title.toLowerCase())).map((template, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => saveDefaultAsCustom(template)}
                        className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 text-left"
                      >
                        <p className="text-[11px] font-medium truncate">{template.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          ${template.reward.toFixed(2)} • {template.recurring}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Selection Mode UI */
              <>
                {/* Custom Task Input */}
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Add Custom Task</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Practice piano"
                      value={customTaskTitle}
                      onChange={(e) => setCustomTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
                      className="h-9"
                    />
                    <Button size="sm" variant="outline" onClick={addCustomTask} className="h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Custom Tasks Added */}
                {selectedTasks.filter(t => t.isCustom).length > 0 && (
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Your Custom Tasks</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTasks.filter(t => t.isCustom).map((task, idx) => (
                        <div
                          key={`custom-${idx}`}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary bg-primary/10 text-xs"
                        >
                          <span className="font-medium">{task.title}</span>
                          <button
                            type="button"
                            onClick={() => removeTask(selectedTasks.findIndex(t => t.title === task.title))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Tap to select multiple
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 pb-4">
                    {allTemplates.map((template, idx) => {
                      const selected = isSelected(template.title);
                      const isUserTemplate = !template.isDefault;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleTask(template)}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all text-left relative",
                            selected 
                              ? "border-primary bg-primary/10 ring-1 ring-primary/50" 
                              : isUserTemplate
                                ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                                : "border-border bg-muted/30 hover:bg-muted/60"
                          )}
                        >
                          {selected && (
                            <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                          <p className="text-xs font-medium truncate pr-5">{template.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-emerald-600 font-medium">
                              ${template.reward.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              • {template.recurring}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t mt-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">{selectedTasks.length} task(s) selected</p>
                      {selectedTasks.filter(t => t.isCustom).length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          incl. {selectedTasks.filter(t => t.isCustom).length} custom
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => setStep("review")} 
                      disabled={selectedTasks.length === 0}
                      className="flex-1 gap-1"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Edit Mode Footer */}
            {editMode && (
              <div className="pt-3 border-t mt-auto">
                <Button onClick={() => setEditMode(false)} className="w-full">
                  Done Editing
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Review List */}
            <p className="text-xs text-muted-foreground mb-2">
              Toggle rewards on/off and adjust amounts
            </p>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
              {selectedTasks.map((task, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {task.recurring} • {task.category}
                        {task.isCustom && <span className="ml-1 text-primary">(custom)</span>}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTask(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={task.rewardEnabled}
                        onCheckedChange={(val) => updateTask(idx, { rewardEnabled: val })}
                        className="scale-90"
                      />
                      <DollarSign className={cn(
                        "h-3.5 w-3.5",
                        task.rewardEnabled ? "text-emerald-600" : "text-muted-foreground"
                      )} />
                    </div>
                    {task.rewardEnabled && (
                      <Input
                        type="number"
                        value={task.reward}
                        onChange={(e) => updateTask(idx, { reward: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-20 text-sm"
                        min="0"
                        step="0.25"
                      />
                    )}
                    {!task.rewardEnabled && (
                      <span className="text-xs text-muted-foreground">No reward</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t mt-auto">
              <div className="flex items-center justify-between mb-3 text-sm">
                <span className="text-muted-foreground">{tasksWithReward} with rewards</span>
                <span className="font-medium text-emerald-600">
                  Total: ${totalReward.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || selectedTasks.length === 0}
                  className="flex-1"
                >
                  {isLoading ? "Adding..." : `Add ${selectedTasks.length} Task(s)`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
