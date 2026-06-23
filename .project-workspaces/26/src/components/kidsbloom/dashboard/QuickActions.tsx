import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, PiggyBank, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddMoneyModal } from "./AddMoneyModal";
import { SpendMoneyModal } from "./SpendMoneyModal";
import { SaveMoneyModal } from "./SaveMoneyModal";
import { GiveMoneyModal } from "./GiveMoneyModal";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface QuickActionsProps {
  kidId: string;
  variant: "playful" | "modern";
  soundEnabled?: boolean;
  spendBalance?: number;
  onBalanceUpdate?: () => void;
  isDarkMode?: boolean;
}

export const QuickActions = ({ kidId, variant, soundEnabled = true, spendBalance = 0, onBalanceUpdate, isDarkMode = false }: QuickActionsProps) => {
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showSpendMoney, setShowSpendMoney] = useState(false);
  const [showSaveMoney, setShowSaveMoney] = useState(false);
  const [showGiveMoney, setShowGiveMoney] = useState(false);
  const isPlayful = variant === "playful";
  const { playCoinCollect, playPop } = useSoundEffects(soundEnabled);

  const handleAddMoney = () => {
    playCoinCollect();
    setShowAddMoney(true);
  };

  const handleSpendMoney = () => {
    playPop();
    setShowSpendMoney(true);
  };

  const handleSaveMoney = () => {
    playCoinCollect();
    setShowSaveMoney(true);
  };

  const handleGiveMoney = () => {
    playCoinCollect();
    setShowGiveMoney(true);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={handleAddMoney}
            className={`
              w-full h-14 text-xs font-semibold rounded-xl flex flex-col items-center justify-center gap-0.5
              ${isPlayful 
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg" 
                : isDarkMode 
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "bg-teal-600 hover:bg-teal-700 text-white shadow-lg"
              }
            `}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            variant="outline"
            onClick={handleSpendMoney}
            className={`
              w-full h-14 text-xs font-semibold rounded-xl flex flex-col items-center justify-center gap-0.5
              ${isPlayful 
                ? "border-2 border-red-400 text-red-500 hover:bg-red-50 bg-white" 
                : isDarkMode
                  ? "border-2 border-destructive text-destructive hover:bg-destructive/10"
                  : "border-2 border-red-400 text-red-600 hover:bg-red-50 bg-white"
              }
            `}
          >
            <Minus className="h-4 w-4" />
            Spend
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleSaveMoney}
            className={`
              w-full h-14 text-xs font-semibold rounded-xl flex flex-col items-center justify-center gap-0.5
              ${isPlayful 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg" 
                : isDarkMode
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
              }
            `}
          >
            <PiggyBank className="h-4 w-4" />
            Save
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Button
            onClick={handleGiveMoney}
            className={`
              w-full h-14 text-xs font-semibold rounded-xl flex flex-col items-center justify-center gap-0.5
              ${isPlayful 
                ? "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg" 
                : isDarkMode
                  ? "bg-pink-500 hover:bg-pink-600 text-white"
                  : "bg-rose-500 hover:bg-rose-600 text-white shadow-lg"
              }
            `}
          >
            <Heart className="h-4 w-4" />
            Give
          </Button>
        </motion.div>
      </div>

      <AddMoneyModal
        open={showAddMoney}
        onOpenChange={setShowAddMoney}
        kidId={kidId}
        variant={variant}
        onSuccess={onBalanceUpdate}
      />

      <SpendMoneyModal
        open={showSpendMoney}
        onOpenChange={setShowSpendMoney}
        kidId={kidId}
        variant={variant}
        onSuccess={onBalanceUpdate}
      />

      <SaveMoneyModal
        open={showSaveMoney}
        onOpenChange={setShowSaveMoney}
        kidId={kidId}
        variant={variant}
        spendBalance={spendBalance}
        onSuccess={onBalanceUpdate}
      />

      <GiveMoneyModal
        open={showGiveMoney}
        onOpenChange={setShowGiveMoney}
        kidId={kidId}
        variant={variant}
        spendBalance={spendBalance}
        onSuccess={onBalanceUpdate}
      />
    </>
  );
};
