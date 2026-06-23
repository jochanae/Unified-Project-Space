import { useState, useEffect } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, RotateCcw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  category: "analysis" | "risk" | "execution";
  checked: boolean;
}

const defaultChecklist: Omit<ChecklistItem, "checked">[] = [
  { id: "1", label: "Identified clear entry trigger", category: "analysis" },
  { id: "2", label: "Confirmed trend direction", category: "analysis" },
  { id: "3", label: "Checked for upcoming catalysts", category: "analysis" },
  { id: "4", label: "Set stop-loss level", category: "risk" },
  { id: "5", label: "Defined profit target(s)", category: "risk" },
  { id: "6", label: "Position sized correctly (1-2% risk)", category: "risk" },
  { id: "7", label: "No emotional bias", category: "execution" },
  { id: "8", label: "Reviewed recent news/earnings", category: "execution" },
];

const categoryLabels = {
  analysis: "📊 Analysis",
  risk: "🛡️ Risk Management",
  execution: "⚡ Execution",
};

const categoryColors = {
  analysis: "text-primary",
  risk: "text-gold",
  execution: "text-gain",
};

export function TradeChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem("trade-checklist");
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultChecklist.map((item) => ({ ...item, checked: false }));
  });

  useEffect(() => {
    localStorage.setItem("trade-checklist", JSON.stringify(items));
  }, [items]);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const resetChecklist = () => {
    setItems(defaultChecklist.map((item) => ({ ...item, checked: false })));
  };

  const checkedCount = items.filter((item) => item.checked).length;
  const progress = (checkedCount / items.length) * 100;
  const isComplete = checkedCount === items.length;

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const headerActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="sm"
        onClick={resetChecklist}
        className="h-8 px-2 text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Reset
      </Button>
    </div>
  );

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Pre-Trade Checklist</span>
          {headerActions}
        </div>
      }
      description="Stay disciplined before every trade"
      icon={<ClipboardCheck className="h-5 w-5 text-primary" />}
      defaultOpen={false}
      storageKey="dashboard-trade-checklist"
    >
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {checkedCount} of {items.length} completed
            </span>
            {isComplete && (
              <span className="text-gain flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Ready to trade!
              </span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Checklist Items */}
        <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
          {(Object.keys(groupedItems) as Array<keyof typeof categoryLabels>).map(
            (category) => (
              <div key={category}>
                <h4
                  className={cn(
                    "text-xs font-medium mb-2",
                    categoryColors[category]
                  )}
                >
                  {categoryLabels[category]}
                </h4>
                <div className="space-y-2">
                  {groupedItems[category].map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                        item.checked
                          ? "bg-gain/10 border border-gain/20"
                          : "bg-muted/30 hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="data-[state=checked]:bg-gain data-[state=checked]:border-gain"
                      />
                      <span
                        className={cn(
                          "text-sm flex-1",
                          item.checked && "line-through text-muted-foreground"
                        )}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Warning if not complete */}
        {!isComplete && checkedCount > 0 && (
          <div className="mt-3 p-2 rounded-lg bg-gold/10 border border-gold/20">
            <p className="text-xs text-gold">
              ⚠️ Complete all items before entering a trade
            </p>
          </div>
        )}
    </CollapsibleCard>
  );
}
