import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ArrowDownLeft, Star, CheckCircle, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TransactionHistoryModalProps {
  kidId: string;
  variant: "playful" | "modern";
  isOpen: boolean;
  onClose: () => void;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  category: string | null;
  transaction_date: string;
}

export function TransactionHistoryModal({ 
  kidId, 
  variant, 
  isOpen, 
  onClose 
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const isPlayful = variant === "playful";

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, kidId]);

  useEffect(() => {
    let filtered = transactions;
    
    if (searchQuery) {
      filtered = filtered.filter(tx => 
        tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }
    
    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, typeFilter]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("kid_transactions")
      .select("*")
      .eq("kid_id", kidId)
      .order("transaction_date", { ascending: false })
      .limit(100);

    if (!error && data) {
      setTransactions(data);
      setFilteredTransactions(data);
    }
    setIsLoading(false);
  };

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
      case "gift":
        return "🎁";
      case "withdrawal":
        return "💸";
      default:
        return "💫";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  // Calculate totals
  const totals = filteredTransactions.reduce((acc, tx) => {
    if (tx.type === "spending" || tx.type === "withdrawal") {
      acc.spent += tx.amount;
    } else {
      acc.earned += tx.amount;
    }
    return acc;
  }, { earned: 0, spent: 0 });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* Modal */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full sm:max-w-lg max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl ${
            isPlayful 
              ? "bg-gradient-to-b from-purple-100 via-pink-50 to-white" 
              : "bg-slate-900"
          }`}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 p-4 border-b ${
            isPlayful ? "bg-white/80 border-purple-200" : "bg-slate-900/90 border-white/10"
          } backdrop-blur-lg`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xl font-bold ${isPlayful ? "text-purple-700" : "text-white"}`}>
                {isPlayful ? "📜 My Money Story" : "Transaction History"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className={isPlayful ? "text-purple-600" : "text-white"}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
                  isPlayful ? "text-purple-400" : "text-white/50"
                }`} />
                <Input
                  placeholder={isPlayful ? "Search your stuff..." : "Search transactions..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 ${
                    isPlayful 
                      ? "bg-white border-purple-200 text-purple-700 placeholder:text-purple-300" 
                      : "bg-white/10 border-white/10 text-white placeholder:text-white/50"
                  }`}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`w-32 ${
                  isPlayful 
                    ? "bg-white border-purple-200 text-purple-700" 
                    : "bg-white/10 border-white/10 text-white"
                }`}>
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="earning">Earned</SelectItem>
                  <SelectItem value="spending">Spent</SelectItem>
                  <SelectItem value="allowance">Allowance</SelectItem>
                  <SelectItem value="gift">Gifts</SelectItem>
                  <SelectItem value="chore_reward">Chores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="flex gap-3 mt-3">
              <div className={`flex-1 p-2 rounded-xl text-center ${
                isPlayful ? "bg-green-100" : "bg-emerald-500/20"
              }`}>
                <p className={`text-xs ${isPlayful ? "text-green-600" : "text-emerald-300"}`}>
                  {isPlayful ? "✅ Got" : "Earned"}
                </p>
                <p className={`font-bold ${isPlayful ? "text-green-700" : "text-emerald-400"}`}>
                  ${totals.earned.toFixed(2)}
                </p>
              </div>
              <div className={`flex-1 p-2 rounded-xl text-center ${
                isPlayful ? "bg-pink-100" : "bg-red-500/20"
              }`}>
                <p className={`text-xs ${isPlayful ? "text-pink-600" : "text-red-300"}`}>
                  {isPlayful ? "💸 Used" : "Spent"}
                </p>
                <p className={`font-bold ${isPlayful ? "text-pink-700" : "text-red-400"}`}>
                  ${totals.spent.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-16 rounded-xl animate-pulse ${
                    isPlayful ? "bg-purple-100" : "bg-white/5"
                  }`} />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className={`text-center py-12 ${isPlayful ? "text-purple-400" : "text-white/50"}`}>
                <span className="text-4xl block mb-3">{isPlayful ? "🔍" : "📊"}</span>
                <p>{searchQuery || typeFilter !== "all" 
                  ? "No transactions match your search" 
                  : "No transactions yet!"}</p>
              </div>
            ) : (
              filteredTransactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center justify-between p-3 rounded-xl ${
                    isPlayful ? "bg-white shadow-sm" : "bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {isPlayful ? getEmoji(tx.type) : ""}
                    </span>
                    {!isPlayful && (
                      <div className="p-2 rounded-lg bg-white/10">
                        {getIcon(tx.type)}
                      </div>
                    )}
                    <div>
                      <p className={`font-medium ${isPlayful ? "text-purple-700" : "text-white"}`}>
                        {tx.description || tx.category || tx.type}
                      </p>
                      <p className={`text-xs ${isPlayful ? "text-purple-400" : "text-white/50"}`}>
                        {formatDate(tx.transaction_date)}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${
                    tx.type === "spending" || tx.type === "withdrawal"
                      ? "text-red-500"
                      : isPlayful
                      ? "text-green-500"
                      : "text-emerald-400"
                  }`}>
                    {tx.type === "spending" || tx.type === "withdrawal" ? "-" : "+"}
                    ${Math.abs(tx.amount).toFixed(2)}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
