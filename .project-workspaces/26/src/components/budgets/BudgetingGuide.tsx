import { useState } from "react";
import { 
  HelpCircle, 
  ChevronDown, 
  Wallet, 
  ArrowLeftRight, 
  RefreshCw, 
  FileText, 
  Zap, 
  Target,
  DollarSign,
  PieChart,
  Info
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface GuideItem {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  tips: string[];
}

const guideItems: GuideItem[] = [
  {
    id: "envelope",
    icon: Wallet,
    title: "Budget by Category",
    description: "The envelope system gives every dollar a job. Allocate your income across budget categories like virtual 'envelopes' - when an envelope is empty, stop spending in that category.",
    tips: [
      "Enter your monthly income at the top to start",
      "Create budget categories (envelopes) for each spending area",
      "Aim to allocate 100% of your income across all envelopes",
      "The bar shows how much of your income is assigned"
    ]
  },
  {
    id: "move-money",
    icon: ArrowLeftRight,
    title: "Moving Money Between Envelopes",
    description: "Life happens! When priorities change, you can move money from one envelope to another. Maybe you spent less on groceries and need more for entertainment.",
    tips: [
      "Tap the arrows icon (↔) to open the Move Money modal",
      "Select which envelope to move FROM and which to move TO",
      "Enter the amount to transfer",
      "Your total budget stays the same, just redistributed"
    ]
  },
  {
    id: "reset",
    icon: RefreshCw,
    title: "Monthly Reset",
    description: "At the start of each month, reset your budgets to start fresh. This clears the 'spent' amounts while keeping your budget limits.",
    tips: [
      "Tap the refresh icon (⟳) to open reset options",
      "Choose to reset all budgets or select specific ones",
      "Consider reviewing last month's spending first",
      "Your budget templates are saved for easy setup"
    ]
  },
  {
    id: "templates",
    icon: FileText,
    title: "Budget Templates",
    description: "Don't know where to start? Use our pre-built templates based on popular budgeting methods like the 50/30/20 rule.",
    tips: [
      "50/30/20: 50% needs, 30% wants, 20% savings",
      "Bare Bones: Essential expenses only for tight months",
      "Debt Payoff: Focused on aggressive debt elimination",
      "Customize any template to fit your situation"
    ]
  },
  {
    id: "bloom-bursts",
    icon: Zap,
    title: "Bloom Bursts",
    description: "Short-term spending challenges to keep you focused. Set a mini-budget for a specific time period (like a weekend trip or shopping spree).",
    tips: [
      "Create a Bloom Burst for short-term events",
      "Set start and end dates for the challenge",
      "Track spending against your mini-budget",
      "Great for staying disciplined during tempting times"
    ]
  },
  {
    id: "link-goals",
    icon: Target,
    title: "Link to Savings Goals",
    description: "Connect your budgets to savings goals. When you spend less than budgeted, the leftover can automatically go toward your goals!",
    tips: [
      "Edit a budget to link it to a goal",
      "Set auto-contribute to YES",
      "Choose what percentage of remaining budget to transfer",
      "At month end, unspent money moves to your goal"
    ]
  },
  {
    id: "log-expense",
    icon: DollarSign,
    title: "Logging Expenses",
    description: "Track spending against each budget by logging expenses. This updates your progress bar and remaining balance.",
    tips: [
      "Tap 'Log Expense' on any budget card",
      "Enter the amount and optional description",
      "The budget's 'spent' amount increases automatically",
      "Watch the progress bar to avoid overspending"
    ]
  },
  {
    id: "spending-chart",
    icon: PieChart,
    title: "Spending Breakdown",
    description: "The pie chart shows where your money is actually going. Compare your spending across categories at a glance.",
    tips: [
      "Colors match your budget categories",
      "Larger slices = more spending in that area",
      "Use this to identify overspending patterns",
      "Compare to your budgeted amounts for insights"
    ]
  }
];

export const BudgetingGuide = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-800/30">
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg">How to Use Budgets</h3>
                  <p className="text-sm text-muted-foreground">Tap to learn about each feature</p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-4 space-y-2">
            {guideItems.map((item) => {
              const Icon = item.icon;
              const isExpanded = expandedItems.includes(item.id);
              
              return (
                <Collapsible 
                  key={item.id} 
                  open={isExpanded}
                  onOpenChange={() => toggleItem(item.id)}
                >
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      isExpanded 
                        ? "bg-white dark:bg-background border border-blue-200 dark:border-blue-800"
                        : "bg-white/50 dark:bg-background/50 hover:bg-white dark:hover:bg-background"
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        isExpanded 
                          ? "bg-blue-100 dark:bg-blue-900/30"
                          : "bg-blue-50 dark:bg-blue-900/20"
                      )}>
                        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium flex-1">{item.title}</span>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                        isExpanded && "rotate-180"
                      )} />
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="px-3 pb-3">
                    <div className="pl-11 pt-2 space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <div className="space-y-1.5">
                        {item.tips.map((tip, index) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-500 mt-0.5">•</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
            
            {/* Link to Help Center */}
            <div className="pt-3 border-t border-blue-200/50 dark:border-blue-800/30">
              <Link to="/help?tab=features">
                <Button variant="outline" size="sm" className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30">
                  <Info className="h-4 w-4 mr-2" />
                  View Full Guide in Help Center
                </Button>
              </Link>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
