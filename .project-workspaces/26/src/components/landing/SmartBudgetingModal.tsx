import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wallet, PieChart, TrendingDown, Target, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface SmartBudgetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SmartBudgetingModal = ({ open, onOpenChange }: SmartBudgetingModalProps) => {
  const features = [
    { icon: PieChart, text: "Visual spending breakdown by category" },
    { icon: TrendingDown, text: "Track & crush debt with payoff strategies" },
    { icon: Target, text: "Set monthly budgets with smart alerts" },
    { icon: CheckCircle2, text: "Push notifications & Gmail bill detection" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Smart Budgeting</DialogTitle>
          <DialogDescription className="text-base">
            Take control of your spending and crush debt with powerful budgeting tools.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-emerald-50/30 to-emerald-100/20 border border-emerald-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-emerald-900/15 dark:to-emerald-800/20 dark:border-emerald-700/30">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Start Budgeting Free
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
