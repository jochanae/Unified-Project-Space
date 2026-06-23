import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  Wallet, 
  Calculator, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Users, 
  Sparkles,
  X,
  Target
} from "lucide-react";
import { toast } from "sonner";

const categories = [
  { value: "housing", label: "Housing", emoji: "🏠" },
  { value: "transportation", label: "Transportation", emoji: "🚗" },
  { value: "food", label: "Food & Dining", emoji: "🍔" },
  { value: "utilities", label: "Utilities", emoji: "💡" },
  { value: "healthcare", label: "Healthcare", emoji: "🏥" },
  { value: "insurance", label: "Insurance", emoji: "🛡️" },
  { value: "savings", label: "Savings", emoji: "💰" },
  { value: "entertainment", label: "Entertainment", emoji: "🎬" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "personal", label: "Personal Care", emoji: "💅" },
  { value: "education", label: "Education", emoji: "📚" },
  { value: "debt", label: "Debt Payments", emoji: "💳" },
  { value: "gifts", label: "Gifts & Donations", emoji: "🎁" },
  { value: "travel", label: "Travel", emoji: "✈️" },
  { value: "other", label: "Other", emoji: "📦" },
];

const months = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const currencies = [
  { value: "USD", label: "USD", flag: "🇺🇸" },
  { value: "EUR", label: "EUR", flag: "🇪🇺" },
  { value: "GBP", label: "GBP", flag: "🇬🇧" },
  { value: "CAD", label: "CAD", flag: "🇨🇦" },
];

interface BudgetItem {
  id: string;
  category: string;
  description: string;
  amount: string;
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

interface CreateBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateBudgetModal = ({ open, onOpenChange, onSuccess }: CreateBudgetModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  
  // Budget items for itemized budget
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([
    { id: "1", category: "", description: "", amount: "" }
  ]);
  
  // Settings
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [currency, setCurrency] = useState("USD");
  const [isRecurring, setIsRecurring] = useState(false);
  const [enableRollover, setEnableRollover] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [linkedGoalId, setLinkedGoalId] = useState("none");
  const [autoContribute, setAutoContribute] = useState(false);
  const [contributionPercent, setContributionPercent] = useState(100);
  
  // Goals from database
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchGoals();
      fetchExistingCategories();
    }
  }, [open, user]);

  const fetchExistingCategories = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("budgets")
        .select("category")
        .eq("user_id", user.id)
        .eq("is_active", true);
      setExistingCategories((data || []).map(b => b.category));
    } catch (error) {
      console.error("Error fetching existing categories:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_amount, current_amount")
        .eq("is_archived", false)
        .order("title");
      
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const resetForm = () => {
    setBudgetItems([{ id: "1", category: "", description: "", amount: "" }]);
    setSelectedMonth(String(new Date().getMonth() + 1));
    setSelectedYear(String(new Date().getFullYear()));
    setCurrency("USD");
    setIsRecurring(false);
    setEnableRollover(false);
    setIsCollaborative(false);
    setLinkedGoalId("none");
    setAutoContribute(false);
    setContributionPercent(100);
  };

  const addBudgetItem = () => {
    setBudgetItems([
      ...budgetItems,
      { id: String(Date.now()), category: "", description: "", amount: "" }
    ]);
  };

  const removeBudgetItem = (id: string) => {
    if (budgetItems.length > 1) {
      setBudgetItems(budgetItems.filter(item => item.id !== id));
    }
  };

  const updateBudgetItem = (id: string, field: keyof BudgetItem, value: string) => {
    setBudgetItems(budgetItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totalAmount = budgetItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const validItemsCount = budgetItems.filter(item => item.category && item.amount).length;

  const handleCreate = async () => {
    if (!user) {
      toast.error("Please sign in to create a budget");
      return;
    }

    const validItems = budgetItems.filter(item => item.category && item.amount && Number(item.amount) > 0);
    
    if (validItems.length === 0) {
      toast.error("Please add at least one budget item with a category and amount");
      return;
    }

    setLoading(true);
    try {
      // Check for duplicate categories
      const newCategories = validItems.map(i => i.category);
      const duplicatesWithExisting = newCategories.filter(c => existingCategories.includes(c));
      const duplicatesWithinNew = newCategories.filter((c, i) => newCategories.indexOf(c) !== i);
      
      if (duplicatesWithinNew.length > 0) {
        const dupeNames = [...new Set(duplicatesWithinNew)].map(c => categories.find(cat => cat.value === c)?.label || c);
        toast.error(`You have duplicate categories in your items: ${dupeNames.join(", ")}. Each category can only have one budget.`);
        setLoading(false);
        return;
      }
      
      if (duplicatesWithExisting.length > 0) {
        const dupeNames = duplicatesWithExisting.map(c => categories.find(cat => cat.value === c)?.label || c);
        toast.error(`You already have active budgets for: ${dupeNames.join(", ")}. Edit the existing budget or delete it first.`);
        setLoading(false);
        return;
      }

      // Create budgets for each valid item with linked goal support
      const budgetsToCreate = validItems.map(item => ({
        name: item.description || categories.find(c => c.value === item.category)?.label || item.category,
        category: item.category as any,
        amount: Number(item.amount),
        user_id: user.id,
        start_date: `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`,
        linked_goal_id: linkedGoalId !== "none" ? linkedGoalId : null,
        auto_contribute: autoContribute && linkedGoalId !== "none",
        contribution_percent: contributionPercent,
      }));

      const { data: createdBudgets, error } = await supabase
        .from("budgets")
        .insert(budgetsToCreate)
        .select();

      if (error) throw error;

      // If collaborative, add the owner as a collaborator
      if (isCollaborative && createdBudgets && createdBudgets.length > 0) {
        const collaboratorInserts = createdBudgets.map(budget => ({
          budget_id: budget.id,
          user_id: user.id,
          role: "owner",
        }));
        
        await supabase.from("budget_collaborators").insert(collaboratorInserts);
      }

      toast.success(`${validItems.length} budget${validItems.length > 1 ? 's' : ''} created!`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating budget:", error);
      toast.error("Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  const years = [
    String(new Date().getFullYear()),
    String(new Date().getFullYear() + 1),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold text-center">Create New Budget</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">Set spending limits to control your expenses</p>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-6 pb-4">
            {/* Create Itemized Budget Section */}
            <Card className="border-0 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
                <h3 className="text-lg font-bold text-white">Create Itemized Budget</h3>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Category Planning | Amount Allocation | Financial Tracking | Budget Control
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Break down your budget into specific categories and amounts for better financial control
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Details Section */}
            <Card className="border-0 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-white" />
                  <h3 className="font-semibold text-white">Budget Details</h3>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Add multiple budget items to create a comprehensive monthly plan
                </p>
                
                {/* Budget Items Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">Budget Items</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addBudgetItem}
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {/* Budget Items List */}
                <div className="space-y-4">
                  {budgetItems.map((item, index) => (
                    <Card key={item.id} className="p-4 relative">
                      {budgetItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeBudgetItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <h5 className="font-medium mb-3">Item #{index + 1}</h5>
                      
                      <div className="space-y-3">
                         <div>
                          <Label className="text-sm">Category</Label>
                          <Select 
                            value={item.category} 
                            onValueChange={(v) => updateBudgetItem(item.id, 'category', v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => {
                                const isExisting = existingCategories.includes(cat.value);
                                const isDuplicateInItems = budgetItems.some(
                                  bi => bi.id !== item.id && bi.category === cat.value
                                );
                                return (
                                  <SelectItem 
                                    key={cat.value} 
                                    value={cat.value}
                                    disabled={isExisting || isDuplicateInItems}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span>{cat.emoji}</span>
                                      <span>{cat.label}</span>
                                      {isExisting && <span className="text-xs text-muted-foreground">(already exists)</span>}
                                    </span>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm">Description</Label>
                          <Input
                            placeholder="e.g., Grocery shopping"
                            value={item.description}
                            onChange={(e) => updateBudgetItem(item.id, 'description', e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label className="text-sm">Amount ($)</Label>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              placeholder="e.g., 500.00"
                              value={item.amount}
                              onChange={(e) => updateBudgetItem(item.id, 'amount', e.target.value)}
                              min="0"
                              step="0.01"
                            />
                            <Calculator className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Total Budget Amount */}
                <Card className="mt-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-900 dark:text-blue-100">Total Budget Amount</p>
                          <p className="text-sm text-blue-600">{validItemsCount} item{validItemsCount !== 1 ? 's' : ''} added</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                        ${totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {/* Month & Year Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Currency Selection */}
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      <span className="flex items-center gap-2">
                        <span>{curr.flag}</span>
                        <span>{curr.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurring Budget Option */}
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox 
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked === true)}
                    className="mt-1 border-purple-400 data-[state=checked]:bg-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-orange-500" />
                      <Label htmlFor="recurring" className="font-semibold cursor-pointer">
                        Make this a recurring monthly budget
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Automatically creates next month's budget on the 1st (continues until turned off)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget Quick Wins */}
            <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/30">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">Budget Quick Wins</h4>
                </div>

                {/* Enable Rollover */}
                <div className="flex items-start gap-4">
                  <Checkbox 
                    id="rollover"
                    checked={enableRollover}
                    onCheckedChange={(checked) => setEnableRollover(checked === true)}
                    className="mt-1 border-purple-400 data-[state=checked]:bg-purple-600"
                  />
                  <div className="flex-1">
                    <Label htmlFor="rollover" className="font-medium cursor-pointer">
                      Enable Budget Rollover
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Unused budget automatically carries over to next month
                    </p>
                  </div>
                </div>

                {/* Collaborative Budget */}
                <div className="flex items-start gap-4">
                  <Checkbox 
                    id="collaborative"
                    checked={isCollaborative}
                    onCheckedChange={(checked) => setIsCollaborative(checked === true)}
                    className="mt-1 border-purple-400 data-[state=checked]:bg-purple-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-teal-600" />
                      <Label htmlFor="collaborative" className="font-medium cursor-pointer">
                        Make this a collaborative budget
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Invite others to view or edit this budget together
                    </p>
                  </div>
                </div>

                {/* Link to Savings Goal */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    <Label>Link to Savings Goal (Optional)</Label>
                  </div>
                  <Select value={linkedGoalId} onValueChange={setLinkedGoalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Don't link to goal</SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <span className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            {goal.title} (${goal.current_amount.toLocaleString()} / ${goal.target_amount.toLocaleString()})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {linkedGoalId !== "none" && (
                    <div className="space-y-3 pt-2 border-t border-purple-200 dark:border-purple-800">
                      <div className="flex items-start gap-4">
                        <Checkbox 
                          id="autoContribute"
                          checked={autoContribute}
                          onCheckedChange={(checked) => setAutoContribute(checked === true)}
                          className="mt-1 border-green-400 data-[state=checked]:bg-green-600"
                        />
                        <div className="flex-1">
                          <Label htmlFor="autoContribute" className="font-medium cursor-pointer">
                            Auto-contribute remaining budget
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            At month-end, unspent budget automatically contributes to this goal
                          </p>
                        </div>
                      </div>
                      
                      {autoContribute && (
                        <div className="space-y-2">
                          <Label className="text-sm">Contribution Percentage: {contributionPercent}%</Label>
                          <Slider
                            value={[contributionPercent]}
                            onValueChange={(v) => setContributionPercent(v[0])}
                            min={10}
                            max={100}
                            step={10}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            {contributionPercent}% of remaining budget will be contributed
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground">
                    Link your budget to a savings goal for automatic contributions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="p-6 pt-4 space-y-3 border-t">
          <Button
            onClick={handleCreate}
            disabled={loading || validItemsCount === 0}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
          >
            {loading ? "Creating..." : "Create Budget"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => { resetForm(); onOpenChange(false); }}
            className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBudgetModal;