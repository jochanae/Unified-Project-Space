import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PiggyBank, ImageIcon, Target, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

interface VisionBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VisionBoardModal = ({ open, onOpenChange }: VisionBoardModalProps) => {
  const features = [
    { icon: ImageIcon, text: "Add photos of your dream goals" },
    { icon: Target, text: "Set target amounts & deadlines" },
    { icon: Sparkles, text: "Watch progress with animations" },
    { icon: Trophy, text: "Celebrate when you hit milestones" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
            <PiggyBank className="h-8 w-8 text-pink-600 dark:text-pink-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Vision Board</DialogTitle>
          <DialogDescription className="text-base">
            Visualize your financial dreams and track progress toward your goals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-pink-50/30 to-pink-100/20 border border-pink-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-pink-900/15 dark:to-pink-800/20 dark:border-pink-700/30">
              <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Create Your Vision Board
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
