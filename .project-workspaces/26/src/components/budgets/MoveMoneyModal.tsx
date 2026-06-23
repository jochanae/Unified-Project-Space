import { useState } from "react";
import { ArrowRight, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { BUDGET_CATEGORY_EMOJIS } from "@/lib/budgetColors";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
}

interface MoveMoneyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
  fromBudgetId?: string;
  onMoveMoney: (fromId: string, toId: string, amount: number) => Promise<void>;
}

export const MoveMoneyModal = ({
  open,
  onOpenChange,
  budgets,
  fromBudgetId,
  onMoveMoney,
}: MoveMoneyModalProps) => {
  const [fromId, setFromId] = useState(fromBudgetId || "");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fromBudget = budgets.find(b => b.id === fromId);
  const toBudget = budgets.find(b => b.id === toId);
  
  // Available to move = budget amount - spent (remaining in envelope)
  const availableToMove = fromBudget ? Math.max(0, fromBudget.amount - fromBudget.spent) : 0;

  const handleSubmit = async () => {
    const moveAmount = parseFloat(amount);
    
    if (!fromId || !toId) {
      toast.error("Please select both envelopes");
      return;
    }
    
    if (fromId === toId) {
      toast.error("Cannot move money to the same envelope");
      return;
    }
    
    if (!moveAmount || moveAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (moveAmount > availableToMove) {
      toast.error(`Only $${availableToMove.toFixed(2)} available to move`);
      return;
    }

    setIsLoading(true);
    try {
      await onMoveMoney(fromId, toId, moveAmount);
      toast.success(`Moved $${moveAmount.toFixed(2)} to ${toBudget?.name}`);
      onOpenChange(false);
      setFromId("");
      setToId("");
      setAmount("");
    } catch (error) {
      console.error("Error moving money:", error);
      toast.error("Failed to move money");
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    return BUDGET_CATEGORY_EMOJIS[category] || "📦";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Move Money Between Envelopes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From Envelope */}
          <div className="space-y-2">
            <Label>From Envelope</Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue placeholder="Select envelope to move from" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => {
                  const remaining = Math.max(0, budget.amount - budget.spent);
                  return (
                    <SelectItem key={budget.id} value={budget.id} disabled={remaining <= 0}>
                      <div className="flex items-center gap-2">
                        <span>{getCategoryEmoji(budget.category)}</span>
                        <span>{budget.name}</span>
                        <span className="text-muted-foreground text-xs">
                          (${remaining.toFixed(2)} available)
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {fromBudget && (
              <p className="text-xs text-muted-foreground">
                Available: ${availableToMove.toFixed(2)}
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* To Envelope */}
          <div className="space-y-2">
            <Label>To Envelope</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder="Select envelope to move to" />
              </SelectTrigger>
              <SelectContent>
                {budgets
                  .filter(b => b.id !== fromId)
                  .map((budget) => (
                    <SelectItem key={budget.id} value={budget.id}>
                      <div className="flex items-center gap-2">
                        <span>{getCategoryEmoji(budget.category)}</span>
                        <span>{budget.name}</span>
                        <span className="text-muted-foreground text-xs">
                          (${budget.amount.toFixed(2)} budgeted)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount to Move</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7"
                max={availableToMove}
                step="0.01"
              />
            </div>
            {fromBudget && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setAmount(availableToMove.toString())}
              >
                Move all (${availableToMove.toFixed(2)})
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Moving..." : "Move Money"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
