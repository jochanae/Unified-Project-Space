import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { BalanceWaveChart } from "./BalanceWaveChart";

interface KidChartsProps {
  kidId: string;
  isDarkMode?: boolean;
}

export const KidCharts = ({ kidId, isDarkMode = false }: KidChartsProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("trend");

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("kid_transactions")
      .select("*")
      .eq("kid_id", kidId)
      .order("transaction_date", { ascending: true })
      .limit(30);

    if (data) setTransactions(data);
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time updates for this kid's transactions
    const channel = supabase
      .channel(`kid-transactions-${kidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kid_transactions',
          filter: `kid_id=eq.${kidId}`
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kidId]);

  // Category breakdown for pie chart
  const categoryData = transactions
    .filter(tx => tx.type === "spending")
    .reduce((acc: any[], tx) => {
      const existing = acc.find(d => d.category === tx.category);
      if (existing) {
        existing.value += tx.amount;
      } else {
        acc.push({ category: tx.category || "other", value: tx.amount });
      }
      return acc;
    }, []);

  // Weekly data for bar chart
  const weeklyData = [
    { day: "Mon", earned: 0, spent: 0 },
    { day: "Tue", earned: 0, spent: 0 },
    { day: "Wed", earned: 0, spent: 0 },
    { day: "Thu", earned: 0, spent: 0 },
    { day: "Fri", earned: 0, spent: 0 },
    { day: "Sat", earned: 0, spent: 0 },
    { day: "Sun", earned: 0, spent: 0 },
  ];

  transactions.forEach(tx => {
    const dayIndex = new Date(tx.transaction_date).getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    if (tx.type === "spending" || tx.type === "withdrawal") {
      weeklyData[adjustedIndex].spent += tx.amount;
    } else {
      weeklyData[adjustedIndex].earned += tx.amount;
    }
  });

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  const containerStyle = isDarkMode 
    ? "bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
    : "bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-emerald-100";

  const titleStyle = isDarkMode ? "text-white" : "text-emerald-800";
  const tabListStyle = isDarkMode 
    ? "bg-white/5 border border-white/10" 
    : "bg-emerald-50 border border-emerald-200";
  const tabTriggerStyle = isDarkMode ? "text-white/70" : "text-emerald-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={containerStyle}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📊</span>
        <h3 className={`text-lg font-semibold ${titleStyle}`}>Money Analytics</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`w-full rounded-xl p-1 gap-1 ${tabListStyle}`}>
          <TabsTrigger 
            value="trend" 
            className={`flex-1 rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white ${tabTriggerStyle} gap-2 transition-all`}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Trend</span>
          </TabsTrigger>
          <TabsTrigger 
            value="breakdown" 
            className={`flex-1 rounded-lg data-[state=active]:bg-violet-600 data-[state=active]:text-white ${tabTriggerStyle} gap-2 transition-all`}
          >
            <PieChartIcon className="h-4 w-4" />
            <span className="text-sm">Pie</span>
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className={`flex-1 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white ${tabTriggerStyle} gap-2 transition-all`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Bar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="mt-4">
          <BalanceWaveChart kidId={kidId} variant="modern" isDarkMode={isDarkMode} />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <h4 className={`text-sm mb-2 ${isDarkMode ? "text-white/80" : "text-slate-600"}`}>Spending by Category</h4>
          <div className="h-40">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: isDarkMode ? "#1f2937" : "#ffffff",
                      border: isDarkMode ? "1px solid #374151" : "1px solid #d1fae5",
                      borderRadius: "8px",
                      color: isDarkMode ? "#fff" : "#065f46",
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-full flex items-center justify-center text-sm font-medium ${isDarkMode ? "text-white/60" : "text-slate-500"}`}>
                No spending data yet
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {categoryData.map((entry, index) => (
              <div key={entry.category} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className={`text-xs capitalize ${isDarkMode ? "text-white/60" : "text-slate-600"}`}>{entry.category}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <h4 className={`text-sm mb-2 ${isDarkMode ? "text-white/80" : "text-slate-600"}`}>This Week's Activity</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis 
                  dataKey="day" 
                  stroke={isDarkMode ? "#ffffff40" : "#10b98140"} 
                  tick={{ fill: isDarkMode ? "#ffffff80" : "#047857", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: isDarkMode ? "#1f2937" : "#ffffff",
                    border: isDarkMode ? "1px solid #374151" : "1px solid #d1fae5",
                    borderRadius: "8px",
                    color: isDarkMode ? "#fff" : "#065f46",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`]}
                />
                <Bar dataKey="earned" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spent" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`text-xs ${isDarkMode ? "text-white/60" : "text-slate-600"}`}>Earned</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className={`text-xs ${isDarkMode ? "text-white/60" : "text-slate-600"}`}>Spent</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
