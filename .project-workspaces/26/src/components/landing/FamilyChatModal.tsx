import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users2, Bell, Shield, Heart } from "lucide-react";
import { Link } from "react-router-dom";

interface FamilyChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FamilyChatModal = ({ open, onOpenChange }: FamilyChatModalProps) => {
  const features = [
    { icon: Users2, text: "Connect parents, kids & guardians" },
    { icon: Bell, text: "Get notified when chores are done" },
    { icon: Shield, text: "Safe, private family-only space" },
    { icon: Heart, text: "Celebrate money wins together" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">Family Chat</DialogTitle>
          <DialogDescription className="text-base">
            Stay connected with your family on money matters in one private space.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-6">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-white/70 via-blue-50/30 to-blue-100/20 border border-blue-200/40 backdrop-blur-sm dark:from-slate-800/70 dark:via-blue-900/15 dark:to-blue-800/20 dark:border-blue-700/30">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <feature.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium">{feature.text}</span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white" 
          size="lg"
          asChild
        >
          <Link to="/auth?mode=signup" onClick={() => onOpenChange(false)}>
            Connect Your Family
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
