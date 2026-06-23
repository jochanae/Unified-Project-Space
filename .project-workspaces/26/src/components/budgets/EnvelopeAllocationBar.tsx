import { useState } from "react";
import { DollarSign, Edit2, Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface EnvelopeAllocationBarProps {
  totalIncome: number;
  totalAllocated: number;
  onIncomeChange: (newIncome: number) => void;
  isLoading?: boolean;
  onAssignClick?: () => void;
  isFromTransactions?: boolean;
}

export const EnvelopeAllocationBar = ({
  totalIncome,
  totalAllocated,
  onIncomeChange,
  isLoading = false,
  onAssignClick,
  isFromTransactions = false,
}: EnvelopeAllocationBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(totalIncome.toString());

  const incomeNotSet = totalIncome <= 0;
  const unallocated = totalIncome - totalAllocated;
  const allocationPercent = totalIncome > 0 ? (totalAllocated / totalIncome) * 100 : 0;
  const isFullyAllocated = !incomeNotSet && Math.abs(unallocated) < 0.01;
  const isOverAllocated = !incomeNotSet && unallocated < -0.01;
  const needsIncome = incomeNotSet && totalAllocated > 0;

  const handleSave = () => {
    const newIncome = parseFloat(editValue) || 0;
    if (newIncome >= 0) {
      onIncomeChange(newIncome);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(totalIncome.toString());
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">
                {isFromTransactions ? "Monthly Income" : "Expected Monthly Income"}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      {isFromTransactions
                        ? "Auto-calculated from your income transactions this month. Tap the edit icon to override with a custom amount."
                        : "Set your expected income for planning. This is separate from actual transactions tracked in Cash Flow."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              {isFromTransactions ? " • From your transactions" : " • For budget planning"}
            </p>
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-28 pl-6 h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
              <Check className="h-4 w-4 text-green-500" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
              <X className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              ${totalIncome.toLocaleString()}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setEditValue(totalIncome.toString());
                setIsEditing(true);
              }}
              disabled={isLoading}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Auto-populated notice */}
      {isFromTransactions && !isEditing && (
        <p className="text-xs text-muted-foreground italic px-1">
          💡 This amount is pulled from your logged income this month. Tap the pencil to override it with a custom planning number.
        </p>
      )}

      {/* Allocation Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Allocated to envelopes</span>
          <span className={cn(
            "font-medium",
            isOverAllocated && "text-red-500",
            isFullyAllocated && !isOverAllocated && "text-green-500"
          )}>
            ${totalAllocated.toLocaleString()} / ${totalIncome.toLocaleString()}
          </span>
        </div>
        <Progress 
          value={Math.min(allocationPercent, 100)} 
          className={cn(
            "h-2",
            isOverAllocated && "[&>div]:bg-red-500",
            isFullyAllocated && !isOverAllocated && "[&>div]:bg-green-500"
          )}
        />
      </div>

      {/* Status Message */}
      <div className={cn(
        "text-xs px-3 py-2 rounded-lg flex items-center gap-2",
        needsIncome && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        isOverAllocated && "bg-red-500/10 text-red-600 dark:text-red-400",
        isFullyAllocated && !isOverAllocated && "bg-green-500/10 text-green-600 dark:text-green-400",
        !isFullyAllocated && !isOverAllocated && !needsIncome && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}>
        {needsIncome ? (
          <button
            onClick={() => {
              setEditValue("0");
              setIsEditing(true);
            }}
            className="flex items-center gap-2 w-full text-left hover:underline cursor-pointer"
          >
            <span className="font-medium">Set your monthly income above</span>
            <span>— so we can track your budget allocation</span>
          </button>
        ) : isOverAllocated ? (
          <>
            <span className="font-medium">Over-allocated by ${Math.abs(unallocated).toLocaleString()}</span>
            <span>— Move money between envelopes to fix</span>
          </>
        ) : isFullyAllocated ? (
          <>
            <span className="font-medium">Every dollar has a job!</span>
            <span>— You're using zero-based budgeting</span>
          </>
        ) : (
          <button
            onClick={onAssignClick}
            className="flex items-center gap-2 w-full text-left hover:underline cursor-pointer"
          >
            <span className="font-medium">${unallocated.toLocaleString()} left to budget</span>
            <span>— Tap to assign to your envelopes</span>
          </button>
        )}
      </div>
    </div>
  );
};
