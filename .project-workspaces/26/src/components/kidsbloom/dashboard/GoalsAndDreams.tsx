import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SavingsGoalsSection } from "./SavingsGoalsSection";
import { KidsVisionBoard } from "./KidsVisionBoard";

interface GoalsAndDreamsProps {
  kidId: string;
  variant: "playful" | "modern";
  currentBalance?: number;
  onBalanceUpdate?: () => void;
  isDarkMode?: boolean;
}

export function GoalsAndDreams({ kidId, variant, currentBalance = 0, onBalanceUpdate, isDarkMode = false }: GoalsAndDreamsProps) {
  const isPlayful = variant === "playful";
  const [activeTab, setActiveTab] = useState("dreams");
  
  // Modern variant light mode colors
  const getModernBg = () => isDarkMode ? "bg-white/5 backdrop-blur-sm border border-white/10" : "bg-white/90 backdrop-blur-sm border border-teal-100";
  const getModernTabBg = () => isDarkMode ? "bg-white/5" : "bg-teal-50/50";
  const getModernActiveTab = () => isDarkMode ? "bg-white/10 text-white" : "bg-white shadow-md text-teal-700";
  const getModernInactiveTab = () => isDarkMode ? "text-white/50 hover:text-white" : "text-teal-500 hover:text-teal-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden ${
        isPlayful 
          ? "bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/50" 
          : getModernBg()
      }`}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`w-full grid grid-cols-2 h-12 p-1 rounded-none ${
          isPlayful 
            ? "bg-purple-100/50" 
            : getModernTabBg()
        }`}>
          <TabsTrigger 
            value="dreams" 
            className={`gap-2 rounded-xl transition-all ${
              activeTab === "dreams"
                ? isPlayful 
                  ? "bg-white shadow-md text-pink-600" 
                  : getModernActiveTab()
                : isPlayful
                  ? "text-pink-400 hover:text-pink-600"
                  : getModernInactiveTab()
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {isPlayful ? "Vision Board ✨" : "Vision"}
          </TabsTrigger>
          <TabsTrigger 
            value="goals" 
            className={`gap-2 rounded-xl transition-all ${
              activeTab === "goals"
                ? isPlayful 
                  ? "bg-white shadow-md text-purple-600" 
                  : getModernActiveTab()
                : isPlayful
                  ? "text-purple-400 hover:text-purple-600"
                  : getModernInactiveTab()
            }`}
          >
            <Target className="h-4 w-4" />
            {isPlayful ? "My Goals 🎯" : "Goals"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="p-4 mt-0">
          <SavingsGoalsSection 
            kidId={kidId} 
            variant={variant} 
            currentBalance={currentBalance}
            onBalanceUpdate={onBalanceUpdate}
            isDarkMode={isDarkMode}
          />
        </TabsContent>

        <TabsContent value="dreams" className="p-4 mt-0">
          <KidsVisionBoard kidId={kidId} variant={variant} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
