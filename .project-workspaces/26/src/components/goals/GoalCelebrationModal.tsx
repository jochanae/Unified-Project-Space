import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, PartyPopper, Star, Sparkles } from "lucide-react";
import { triggerGoalCelebration } from "@/lib/confetti";

interface GoalCelebrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalTitle: string;
  goalAmount: number;
}

const GoalCelebrationModal = ({ 
  open, 
  onOpenChange, 
  goalTitle, 
  goalAmount 
}: GoalCelebrationModalProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (open) {
      // Trigger confetti
      triggerGoalCelebration();
      
      // Delay content appearance for dramatic effect
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-white/10 animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <Star className="absolute top-4 right-12 h-6 w-6 text-yellow-300 animate-pulse" />
          <Star className="absolute bottom-20 left-8 h-4 w-4 text-yellow-300 animate-pulse" style={{ animationDelay: "0.3s" }} />
          <Sparkles className="absolute top-16 left-4 h-5 w-5 text-white/60 animate-pulse" style={{ animationDelay: "0.7s" }} />
        </div>

        <div className={`relative z-10 text-center py-6 transition-all duration-500 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {/* Trophy icon with animation */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <PartyPopper className="absolute -top-2 -right-2 h-8 w-8 text-yellow-300 animate-bounce" />
          </div>

          {/* Celebration text */}
          <h2 className="text-3xl font-bold mb-2 animate-fade-in">
            🎉 Goal Complete! 🎉
          </h2>
          
          <p className="text-lg text-white/90 mb-4">
            You've reached your target for
          </p>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
            <p className="text-xl font-bold">{goalTitle}</p>
            <p className="text-3xl font-bold mt-2">
              ${goalAmount.toLocaleString()}
            </p>
          </div>

          <p className="text-white/80 text-sm mb-6">
            Amazing work! You've proven that consistency and dedication pay off. 
            Keep up the momentum! 💪
          </p>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-white text-purple-600 hover:bg-white/90 font-bold text-lg h-12"
          >
            Continue Celebrating! 🥳
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalCelebrationModal;
