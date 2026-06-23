import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Wallet, Target, ListChecks, Activity, Calculator, NotebookPen, BarChart3, Gamepad2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface KidsMenuProps {
  variant: "playful" | "modern";
  kidId: string;
  onNavigate: (sectionId: string) => void;
  onOpenCalculator: () => void;
  onOpenNotes: () => void;
  onOpenChat: () => void;
  isDarkMode?: boolean;
}

const menuItems = [
  { id: "buckets", target: "buckets", label: "My Money", playfulLabel: "My Money 💰", icon: Wallet },
  { id: "goals", target: "goals", label: "Goals & Dreams", playfulLabel: "Goals & Dreams 🎯", icon: Target },
  { id: "chores", target: "chores", label: "My Tasks", playfulLabel: "My Tasks ✅", icon: ListChecks },
  { id: "charts", target: "charts", label: "My Charts", playfulLabel: "My Charts 📊", icon: BarChart3 },
  { id: "activity", target: "activity", label: "Activity", playfulLabel: "Activity 📝", icon: Activity },
  { id: "learn", target: "learn", label: "Learn & Play", playfulLabel: "Learn & Play 🎮", icon: Gamepad2 },
  { id: "chat", target: "chat", label: "Chat", playfulLabel: "Chat 💬", icon: MessageCircle },
  { id: "calculator", target: "calculator", label: "Calculator", playfulLabel: "Calculator 🧮", icon: Calculator },
  { id: "notes", target: "notes", label: "My Notes", playfulLabel: "My Notes 📓", icon: NotebookPen },
];

export function KidsHamburgerMenu({ variant, kidId, onNavigate, onOpenCalculator, onOpenNotes, onOpenChat, isDarkMode = false }: KidsMenuProps) {
  const [open, setOpen] = useState(false);
  const isPlayful = variant === "playful";

  const getTriggerStyle = () => {
    if (isPlayful) return "text-purple-600";
    if (isDarkMode) return "text-white";
    return "text-emerald-700";
  };

  const getTriggerBgStyle = () => {
    if (isPlayful) return "bg-white/70 border border-purple-200";
    if (isDarkMode) return "bg-white/10 border border-white/20";
    return "bg-emerald-100 border border-emerald-200";
  };

  const getSheetStyle = () => {
    if (isPlayful) return "bg-gradient-to-b from-purple-100 via-pink-50 to-blue-100";
    if (isDarkMode) return "bg-gradient-to-b from-slate-950 via-indigo-950 to-black border-white/10";
    return "bg-gradient-to-b from-slate-50 via-gray-50 to-emerald-50 border-emerald-100";
  };

  const getTitleStyle = () => {
    if (isPlayful) return "text-purple-600";
    if (isDarkMode) return "text-white";
    return "text-emerald-700";
  };

  const getMenuItemStyle = () => {
    if (isPlayful) return "bg-white/60 hover:bg-white/80 text-purple-700 hover:scale-[1.02]";
    if (isDarkMode) return "bg-white/5 hover:bg-white/10 text-white/90 hover:text-white";
    return "bg-white/80 hover:bg-white text-emerald-700 hover:scale-[1.02]";
  };

  const getIconBgStyle = () => {
    if (isPlayful) return "bg-purple-200/50";
    if (isDarkMode) return "bg-violet-500/20";
    return "bg-emerald-100";
  };

  const getIconStyle = () => {
    if (isPlayful) return "text-purple-600";
    if (isDarkMode) return "text-violet-400";
    return "text-emerald-600";
  };

  const handleNavigate = (sectionId: string) => {
    // Close the sheet first
    setOpen(false);
    
    // Handle special actions (modals)
    if (sectionId === "calculator") {
      setTimeout(() => onOpenCalculator(), 300);
      return;
    }
    if (sectionId === "notes") {
      setTimeout(() => onOpenNotes(), 300);
      return;
    }
    if (sectionId === "chat") {
      setTimeout(() => onOpenChat(), 300);
      return;
    }
    
    // Wait for sheet close animation to complete, then scroll
    setTimeout(() => {
      onNavigate(sectionId);
    }, 350);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={`flex flex-col items-center gap-0.5 h-auto py-1 px-2 ${getTriggerStyle()}`}
        >
          <div className={`p-2 rounded-full ${getTriggerBgStyle()}`}>
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className={`w-72 rounded-r-3xl ${getSheetStyle()}`}
      >
        <SheetHeader>
          <SheetTitle className={getTitleStyle()}>
            {isPlayful ? "Jump To! 🚀" : "Navigate"}
          </SheetTitle>
        </SheetHeader>
        
        <nav className="mt-6 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNavigate(item.target)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${getMenuItemStyle()}`}
            >
              <div className={`p-2 rounded-lg ${getIconBgStyle()}`}>
                <item.icon className={`h-5 w-5 ${getIconStyle()}`} />
              </div>
              <span className="font-medium">
                {isPlayful ? item.playfulLabel : item.label}
              </span>
            </motion.button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
