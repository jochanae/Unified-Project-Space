import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, DollarSign, Folder, Calendar } from "lucide-react";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
  is_active: boolean;
  start_date: string;
  linked_goal_id?: string | null;
  auto_contribute?: boolean;
  contribution_percent?: number;
}

interface EditBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onSuccess: () => void;
}

const categories = [
  { value: "housing", label: "🏠 Housing" },
  { value: "transportation", label: "🚗 Transportation" },
  { value: "food", label: "🍔 Food" },
  { value: "utilities", label: "💡 Utilities" },
  { value: "healthcare", label: "🏥 Healthcare" },
  { value: "insurance", label: "🛡️ Insurance" },
  { value: "savings", label: "💰 Savings" },
  { value: "entertainment", label: "🎬 Entertainment" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "personal", label: "💅 Personal" },
  { value: "education", label: "📚 Education" },
  { value: "debt", label: "💳 Debt" },
  { value: "gifts", label: "🎁 Gifts" },
  { value: "travel", label: "✈️ Travel" },
  { value: "other", label: "📦 Other" },
];

const periods = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export const EditBudgetModal = ({ 
  open, 
  onOpenChange, 
  budget, 
  onSuccess 
}: EditBudgetModalProps) => {
  const { user } = useAuth();
  const [name, setName] = useState(budget.name);
  const [amount, setAmount] = useState(String(budget.amount));
  const [category, setCategory] = useState(budget.category);
  const [period, setPeriod] = useState(budget.period);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(budget.name);
    setAmount(String(budget.amount));
    setCategory(budget.category);
    setPeriod(budget.period);
  }, [budget]);

  const handleSubmit = async () => {
    if (!user) return;

    if (!name.trim()) {
      toast.error("Please enter a budget name");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("budgets")
        .update({
          name: name.trim(),
          amount: parseFloat(amount),
          category: category as any,
          period,
        })
        .eq("id", budget.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Budget updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating budget:", error);
      toast.error("Failed to update budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Budget
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Budget Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Budget Name</Label>
            <Input
              id="name"
              placeholder="e.g., Groceries, Entertainment"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              Budget Amount
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Folder className="h-4 w-4" />
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Budget Period
            </Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Spending Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current spent:</span>
              <span className="font-semibold">${Number(budget.spent).toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
