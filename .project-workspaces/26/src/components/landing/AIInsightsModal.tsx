import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, Brain, Lightbulb, BarChart3, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface AIInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIInsightsModal = ({ open, onOpenChange }: AIInsightsModalProps) => {
  const features = [
    { icon: Brain, text: "Bloom analyzes your spending" },
    { icon: Lightbulb, text: "Get personalized money-saving tips" },
    { icon: BarChart3, text: "Spot spending patterns, trends & analyze cash flow" },
    { icon: Zap, text: "Instant answers to finance questions" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-teal-600 dark:text-teal-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Bloom — Financial Architect</DialogTitle>
          <DialogDescription className="text-base">
            Guiding you like a mentor, building like an architect — Bloom designs your financial life with structured intelligence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-teal-50/30 to-teal-100/20 border border-teal-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-teal-900/15 dark:to-teal-800/20 dark:border-teal-700/30">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Meet Your AI Coach
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
