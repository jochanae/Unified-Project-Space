import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Smartphone,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Coffee,
  Fuel,
  Plane,
} from "lucide-react";

interface Transaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  type: "debit" | "credit";
  date: string;
  status: "completed" | "pending" | "declined";
}

const categoryIcons: Record<string, React.ReactNode> = {
  shopping: <ShoppingBag className="h-4 w-4" />,
  food: <Utensils className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  housing: <Home className="h-4 w-4" />,
  entertainment: <Smartphone className="h-4 w-4" />,
  gifts: <Gift className="h-4 w-4" />,
  coffee: <Coffee className="h-4 w-4" />,
  gas: <Fuel className="h-4 w-4" />,
  travel: <Plane className="h-4 w-4" />,
  income: <ArrowDownLeft className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  shopping: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  food: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  transport: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  housing: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  entertainment: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  gifts: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
  coffee: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  gas: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400",
  travel: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  income: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
};

// Mock transactions
const mockTransactions: Transaction[] = [
  { id: "1", merchant: "Amazon", category: "shopping", amount: 79.99, type: "debit", date: "2024-01-15", status: "completed" },
  { id: "2", merchant: "Payroll Deposit", category: "income", amount: 3500.00, type: "credit", date: "2024-01-15", status: "completed" },
  { id: "3", merchant: "Chipotle", category: "food", amount: 15.43, type: "debit", date: "2024-01-14", status: "completed" },
  { id: "4", merchant: "Uber", category: "transport", amount: 24.50, type: "debit", date: "2024-01-14", status: "completed" },
  { id: "5", merchant: "Starbucks", category: "coffee", amount: 6.75, type: "debit", date: "2024-01-13", status: "completed" },
  { id: "6", merchant: "Shell Gas", category: "gas", amount: 45.00, type: "debit", date: "2024-01-13", status: "completed" },
  { id: "7", merchant: "Netflix", category: "entertainment", amount: 15.99, type: "debit", date: "2024-01-12", status: "completed" },
  { id: "8", merchant: "Target", category: "shopping", amount: 127.84, type: "debit", date: "2024-01-11", status: "completed" },
  { id: "9", merchant: "Venmo Transfer", category: "income", amount: 50.00, type: "credit", date: "2024-01-10", status: "completed" },
  { id: "10", merchant: "Whole Foods", category: "food", amount: 89.32, type: "debit", date: "2024-01-10", status: "pending" },
];

export const CardTransactions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch = tx.merchant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || tx.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((acc, tx) => {
    const dateKey = formatDate(tx.date);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="flex-shrink-0"
        >
          All
        </Button>
        {Object.keys(categoryIcons).map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className="flex-shrink-0 capitalize"
          >
            {categoryIcons[cat]}
            <span className="ml-1">{cat}</span>
          </Button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(([date, transactions]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${categoryColors[tx.category]}`}>
                          {categoryIcons[tx.category]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{tx.merchant}</p>
                            {tx.status === "pending" && (
                              <Badge variant="outline" className="text-xs">Pending</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground capitalize">{tx.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${tx.type === "credit" ? "text-emerald-600" : ""}`}>
                            {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No transactions found</p>
        </div>
      )}
    </div>
  );
};
