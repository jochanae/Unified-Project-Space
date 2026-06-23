import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Star, ListChecks, PiggyBank, Award } from "lucide-react";
import { Link } from "react-router-dom";

interface KidsBloomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KidsBloomModal = ({ open, onOpenChange }: KidsBloomModalProps) => {
  const features = [
    { icon: ListChecks, text: "Assign chores with reward amounts" },
    { icon: PiggyBank, text: "Kids track savings goals visually" },
    { icon: Award, text: "Earn badges & streaks for good habits" },
    { icon: Star, text: "100% free for families forever" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">KidsBloom App</DialogTitle>
          <DialogDescription className="text-base">
            Teach your kids money skills with fun, interactive tools they will love.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-purple-50/30 to-purple-100/20 border border-purple-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-purple-900/15 dark:to-purple-800/20 dark:border-purple-700/30">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Get KidsBloom Free
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
