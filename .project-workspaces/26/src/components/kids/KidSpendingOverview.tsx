import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface KidSpendingOverviewProps {
  kidId: string;
  kidProfile: {
    display_name: string;
    current_balance: number;
    total_earned: number;
    total_spent: number;
  };
}

export const KidSpendingOverview = ({ kidId, kidProfile }: KidSpendingOverviewProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from("kid_transactions")
        .select("*")
        .eq("kid_id", kidId)
        .order("transaction_date", { ascending: true })
        .limit(30);

      if (data) {
        setTransactions(data);
        
        // Process category data
        const categories = data
          .filter(tx => tx.type === "spending")
          .reduce((acc: any, tx) => {
            const cat = tx.category || "other";
            acc[cat] = (acc[cat] || 0) + tx.amount;
            return acc;
          }, {});

        setCategoryData(
          Object.entries(categories).map(([name, value]) => ({ name, value }))
        );
      }
    };

    fetchTransactions();
  }, [kidId]);

  // Process balance trend
  let runningBalance = 0;
  const balanceData = transactions.map(tx => {
    const amount = tx.type === "spending" || tx.type === "withdrawal" ? -tx.amount : tx.amount;
    runningBalance += amount;
    return {
      date: new Date(tx.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      balance: runningBalance,
    };
  });

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  const stats = [
    { label: "Balance", value: kidProfile.current_balance, icon: Wallet, color: "text-primary" },
    { label: "Total Earned", value: kidProfile.total_earned, icon: TrendingUp, color: "text-green-500" },
    { label: "Total Spent", value: kidProfile.total_spent, icon: TrendingDown, color: "text-red-500" },
    { label: "Saved", value: kidProfile.total_earned - kidProfile.total_spent, icon: PiggyBank, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl font-bold">${stat.value.toFixed(2)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Balance Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Balance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {balanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={balanceData}>
                    <defs>
                      <linearGradient id="parentBalanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Balance"]} />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#parentBalanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No transaction data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No spending data yet
                </div>
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.slice(-10).reverse().map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-bold ${
                    tx.type === "spending" || tx.type === "withdrawal" 
                      ? "text-red-500" 
                      : "text-green-500"
                  }`}>
                    {tx.type === "spending" || tx.type === "withdrawal" ? "-" : "+"}
                    ${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
