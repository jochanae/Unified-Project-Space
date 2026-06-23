import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  Sparkles,
  PiggyBank,
  CheckCircle,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  X,
  Heart,
} from "lucide-react";

interface FamilyOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  {
    icon: PiggyBank,
    title: "Teach Money Skills",
    description: "Help kids learn to save, spend wisely, and give back",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: ClipboardList,
    title: "Chores & Rewards",
    description: "Assign chores and track completion with fun rewards",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: MessageSquare,
    title: "Family Chat",
    description: "Safe messaging between parents and kids",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: CheckCircle,
    title: "Spending Controls",
    description: "Set limits and approve purchases together",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

export const FamilyOnboardingModal = ({
  open,
  onOpenChange,
}: FamilyOnboardingModalProps) => {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  const handleGetStarted = () => {
    setIsExiting(true);
    setTimeout(() => {
      onOpenChange(false);
      navigate("/kids", { state: { openLinkModal: true } });
    }, 200);
  };

  const handleLearnMore = () => {
    setIsExiting(true);
    setTimeout(() => {
      onOpenChange(false);
      navigate("/kids");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section */}
              <div className="relative px-6 pt-8 pb-4 text-center">
                {/* Decorative elements */}
                <div className="absolute top-4 left-4 w-16 h-16 rounded-full bg-pink-500/10 blur-xl" />
                <div className="absolute top-8 right-6 w-12 h-12 rounded-full bg-purple-500/10 blur-xl" />
                
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="relative"
                >
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 left-1/2 ml-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </motion.div>

                <DialogHeader className="mt-4">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Bring Your Family Onboard
                  </DialogTitle>
                </DialogHeader>
                
                <p className="text-muted-foreground text-sm mt-2">
                  Teach your kids healthy money habits while managing allowances and chores together
                </p>
              </div>

              {/* Features Grid */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="p-3 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg ${feature.bg} flex items-center justify-center mb-2`}>
                        <feature.icon className={`h-5 w-5 ${feature.color}`} />
                      </div>
                      <h4 className="font-medium text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 space-y-3">
                <Button
                  onClick={handleGetStarted}
                  className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-500/25"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleLearnMore}
                    className="flex-1"
                  >
                    Learn More
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 text-muted-foreground"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
