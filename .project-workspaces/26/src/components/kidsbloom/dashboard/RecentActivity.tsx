import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownLeft, Star, CheckCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TransactionHistoryModal } from "./TransactionHistoryModal";

interface RecentActivityProps {
  kidId: string;
  variant?: "playful" | "modern";
  isDarkMode?: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  category: string | null;
  transaction_date: string;
}

export function RecentActivity({ kidId, variant = "playful", isDarkMode = false }: RecentActivityProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const isPlayful = variant === "playful";
  
  // Modern light mode colors
  const getModernBg = () => isDarkMode ? "bg-white/5 border border-white/10" : "bg-white/90 border border-teal-100";
  const getModernText = () => isDarkMode ? "text-white" : "text-teal-800";
  const getModernTextMuted = () => isDarkMode ? "text-white/50" : "text-teal-600";
  const getModernCardBg = () => isDarkMode ? "bg-white/5" : "bg-teal-50/50";
  const getModernBtnText = () => isDarkMode ? "text-white/70 hover:text-white" : "text-teal-600 hover:text-teal-800";

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("kid_transactions")
        .select("*")
        .eq("kid_id", kidId)
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (!error && data) {
        setTransactions(data);
      }
      setIsLoading(false);
    };

    fetchTransactions();
  }, [kidId]);

  const getIcon = (type: string) => {
    switch (type) {
      case "earning":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case "spending":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "allowance":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "chore_reward":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-purple-500" />;
    }
  };

  const getEmoji = (type: string) => {
    switch (type) {
      case "earning":
        return "💰";
      case "spending":
        return "🛒";
      case "allowance":
        return "⭐";
      case "chore_reward":
        return "✅";
      case "savings":
        return "🐷";
      default:
        return "💫";
    }
  };

  if (isLoading) {
    return (
      <div className={`rounded-2xl p-4 ${isPlayful ? "bg-white/80" : getModernBg()}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${
        isPlayful
          ? "bg-white/80 border-2 border-purple-200"
          : getModernBg()
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold ${isPlayful ? "text-purple-600" : getModernText()}`}>
          {isPlayful ? "🕐 Recent Stuff" : "Recent Activity"}
        </h3>
        {transactions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className={`text-xs ${isPlayful ? "text-purple-500 hover:text-purple-700" : getModernBtnText()}`}
          >
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className={`text-center py-6 ${isPlayful ? "text-purple-400" : getModernTextMuted()}`}>
          <span className="text-3xl block mb-2">{isPlayful ? "🌱" : "📊"}</span>
          <p className="text-sm">
            {isPlayful ? "No activity yet! Start earning!" : "No recent transactions"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx, index) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-2.5 rounded-xl ${
                isPlayful ? "bg-purple-50" : getModernCardBg()
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{isPlayful ? getEmoji(tx.type) : ""}</span>
                {!isPlayful && (
                  <div className={`p-1.5 rounded-lg ${isDarkMode ? "bg-white/10" : "bg-teal-100"}`}>
                    {getIcon(tx.type)}
                  </div>
                )}
                <div>
                  <p className={`text-sm font-medium ${isPlayful ? "text-purple-700" : getModernText()}`}>
                    {tx.description || tx.category || tx.type}
                  </p>
                  <p className={`text-xs ${isPlayful ? "text-purple-400" : getModernTextMuted()}`}>
                    {new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span
                className={`font-bold ${
                  tx.type === "spending"
                    ? "text-red-500"
                    : isPlayful
                    ? "text-green-500"
                    : "text-emerald-400"
                }`}
              >
                {tx.type === "spending" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        kidId={kidId}
        variant={variant}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </motion.div>
  );
}
