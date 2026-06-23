import { useState } from "react";
import { Lightbulb, Sparkles, ChevronRight, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BloomCoachProfileSheet } from "./BloomCoachProfileSheet";

interface BloomCoachQuickTopicsProps {
  onSelectTopic: (text: string) => void;
}

const trySaying = [
  "Help me make a budget",
  "How can I pay off debt faster?",
  "What bills do I have coming up?",
  "How should I build an emergency fund?",
  "Review my spending habits",
  "Tips to improve my credit score",
];

const categories = [
  { icon: "🎯", label: "Start Here" },
  { icon: "💰", label: "Budgeting" },
  { icon: "💳", label: "Debt Payoff" },
  { icon: "🏦", label: "Savings Goals" },
  { icon: "📊", label: "Spending Analysis" },
  { icon: "📋", label: "Bills & Payments" },
  { icon: "📈", label: "Credit Score" },
  { icon: "🛡️", label: "Emergency Fund" },
];

export function BloomCoachQuickTopics({ onSelectTopic }: BloomCoachQuickTopicsProps) {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleSelect = (text: string) => {
    onSelectTopic(text);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-amber-400 hover:text-amber-300 hover:bg-white/15"
          title="Quick Topics"
        >
          <Lightbulb className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-[300px] p-0 bg-card border-border shadow-xl rounded-xl overflow-hidden"
      >
        <div
          className="overflow-y-auto overscroll-contain p-4"
          style={{
            maxHeight: "min(calc(var(--radix-popover-content-available-height, 70vh) - 12px), 24rem)",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold text-sm text-foreground">Quick Topics</h3>
            </div>

            <button
              onClick={() => {
                setOpen(false);
                setShowProfile(true);
              }}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserRound className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground">Bloom Knows Me</div>
                  <div className="text-xs text-muted-foreground">Help me personalize your experience</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Try saying...</span>
              </div>
              <div className="space-y-1">
                {trySaying.map((text) => (
                  <button
                    key={text}
                    onClick={() => handleSelect(text)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-sm text-foreground transition-colors"
                  >
                    "{text}"
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => handleSelect(`Help me with ${cat.label.toLowerCase()}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted text-sm text-foreground transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>

      <BloomCoachProfileSheet open={showProfile} onOpenChange={setShowProfile} />
    </Popover>
  );
}
