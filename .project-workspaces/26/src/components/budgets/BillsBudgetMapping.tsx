import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Receipt, CreditCard, Calendar, ArrowRight, Info, Plus, CheckCircle2 } from "lucide-react";
import { BudgetBill, mapBillToBudgetCategory } from "@/hooks/useBudgetBills";
import { BUDGET_CATEGORY_EMOJIS } from "@/lib/budgetColors";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BillsBudgetMappingProps {
  bills: BudgetBill[];
  budgets: Array<{ name: string; category: string; amount: number; spent: number }>;
}

const BillsBudgetMapping = ({ bills, budgets }: BillsBudgetMappingProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (bills.length === 0) return null;

  // Group bills by their mapped budget category
  const billsByBudgetCategory: Record<string, { bills: BudgetBill[]; budgetName: string; budgetAmount: number; budgetSpent: number }> = {};

  bills.forEach((bill) => {
    const budgetCat = mapBillToBudgetCategory(bill.category);
    if (!billsByBudgetCategory[budgetCat]) {
      const matchingBudget = budgets.find((b) => b.category === budgetCat);
      billsByBudgetCategory[budgetCat] = {
        bills: [],
        budgetName: matchingBudget?.name || budgetCat,
        budgetAmount: matchingBudget?.amount || 0,
        budgetSpent: matchingBudget?.spent || 0,
      };
    }
    billsByBudgetCategory[budgetCat].bills.push(bill);
  });

  const unmappedBills = bills.filter((bill) => {
    const budgetCat = mapBillToBudgetCategory(bill.category);
    return !budgets.some((b) => b.category === budgetCat);
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 dark:border-amber-800/40">
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Bills → Budget Mapping</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">Shows how each upcoming bill maps to your budget categories. This helps you see what's already committed before you spend.</p>
                </TooltipContent>
              </Tooltip>
              <Badge variant="secondary" className="text-xs">
                {bills.length} bill{bills.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {Object.entries(billsByBudgetCategory).map(([category, data]) => {
              const totalBills = data.bills.reduce((s, b) => s + Number(b.amount), 0);
              const hasBudget = budgets.some((b) => b.category === category);
              const unpaidTotal = data.bills.filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.amount), 0);
              const remaining = data.budgetAmount - data.budgetSpent - unpaidTotal;

              return (
                <div key={category} className="rounded-lg border p-3 space-y-2">
                  {/* Category header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{BUDGET_CATEGORY_EMOJIS[category] || "📦"}</span>
                      <span className="text-sm font-semibold capitalize">{data.budgetName}</span>
                      {!hasBudget && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          No budget set
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                        ${unpaidTotal.toLocaleString()}
                      </span>
                      {totalBills !== unpaidTotal && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          (${totalBills.toLocaleString()} total)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bills in this category */}
                  {data.bills.map((bill) => {
                    const isPaid = bill.status === 'paid';
                    const isProjected = bill.is_projected;
                    return (
                      <div key={bill.id} className={`flex items-center gap-2 pl-7 text-xs ${isPaid ? "opacity-60" : ""}`}>
                        {isPaid ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-muted-foreground capitalize">{bill.category}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                        <span className={`truncate flex-1 ${isPaid ? "line-through" : ""}`}>{bill.name}</span>
                        {isPaid ? (
                          <Badge className="text-[9px] h-3.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 flex-shrink-0">
                            Paid
                          </Badge>
                        ) : isProjected ? (
                          <Badge className="text-[9px] h-3.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 flex-shrink-0">
                            Projected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-3.5 border-amber-300 text-amber-600 flex-shrink-0">
                            Pending
                          </Badge>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                          <Calendar className="h-3 w-3" />
                          {new Date(bill.due_date + 'T00:00:00').toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <span className={`font-semibold flex-shrink-0 ${isPaid ? "line-through" : ""}`}>${Number(bill.amount).toLocaleString()}</span>
                      </div>
                    );
                  })}

                  {/* Category subtotal */}
                  {hasBudget && (
                    <div className={`flex items-center justify-between text-xs pt-1 border-t border-border/50 ${
                      remaining < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
                    }`}>
                      <span>After actual + bills:</span>
                      <span className="font-semibold">
                        {remaining < 0 ? `-$${Math.abs(remaining).toLocaleString()}` : `$${remaining.toLocaleString()} left`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Bill Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => navigate("/bills?action=create")}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add a Bill
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default BillsBudgetMapping;
