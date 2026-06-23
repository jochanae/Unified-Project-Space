import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Calendar } from "lucide-react";
import { BalanceWaveChart } from "./BalanceWaveChart";

interface PlayfulChartsProps {
  kidId: string;
  currentBalance?: number;
  spendBalance?: number;
  saveBalance?: number;
  giveBalance?: number;
}

export const PlayfulCharts = ({ 
  kidId, 
  currentBalance = 0,
  spendBalance = 0,
  saveBalance = 0,
  giveBalance = 0
}: PlayfulChartsProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("trend");

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data } = await supabase
        .from("kid_transactions")
        .select("*")
        .eq("kid_id", kidId)
        .order("transaction_date", { ascending: true });

      if (data) setTransactions(data);
    };

    fetchTransactions();
  }, [kidId]);

  // Helper to parse date string without timezone shift
  const parseDateString = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  // Bucket breakdown for pie chart (Spend/Save/Give)
  const bucketData = [
    { name: "Spend", value: spendBalance, emoji: "💸", color: "#6366F1" },
    { name: "Save", value: saveBalance, emoji: "🐷", color: "#10B981" },
    { name: "Give", value: giveBalance, emoji: "💝", color: "#F59E0B" },
  ].filter(b => b.value > 0);

  // Category breakdown for spending pie chart
  const categoryEmojis: Record<string, string> = {
    toys: "🧸",
    games: "🎮",
    food: "🍕",
    clothes: "👕",
    savings: "🐷",
    books: "📚",
    other: "🎁",
  };

  const categoryData = transactions
    .filter(tx => tx.type === "spending")
    .reduce((acc: any[], tx) => {
      const category = tx.category || "other";
      const existing = acc.find(d => d.category === category);
      if (existing) {
        existing.value += tx.amount;
      } else {
        acc.push({ 
          category, 
          value: tx.amount, 
          emoji: categoryEmojis[category] || "🎁" 
        });
      }
      return acc;
    }, []);

  // Weekly data for bar chart
  const weeklyData = [
    { day: "Mon", earned: 0, spent: 0, emoji: "😊" },
    { day: "Tue", earned: 0, spent: 0, emoji: "🌟" },
    { day: "Wed", earned: 0, spent: 0, emoji: "🚀" },
    { day: "Thu", earned: 0, spent: 0, emoji: "🎯" },
    { day: "Fri", earned: 0, spent: 0, emoji: "🎉" },
    { day: "Sat", earned: 0, spent: 0, emoji: "🌈" },
    { day: "Sun", earned: 0, spent: 0, emoji: "☀️" },
  ];

  transactions.forEach(tx => {
    const txDate = parseDateString(tx.transaction_date);
    const dayIndex = txDate.getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    if (tx.type === "spending" || tx.type === "withdrawal") {
      weeklyData[adjustedIndex].spent += tx.amount;
    } else {
      weeklyData[adjustedIndex].earned += tx.amount;
    }
  });

  // Gender-neutral, inviting colors
  const BUCKET_COLORS = ["#6366F1", "#10B981", "#F59E0B"];
  const CATEGORY_COLORS = ["#6366F1", "#10B981", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-100 via-purple-50 to-teal-100 rounded-3xl p-4 overflow-hidden relative"
    >
      {/* Floating decorations */}
      <motion.span 
        className="absolute top-2 right-3 text-xl"
        animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        ✨
      </motion.span>
      <motion.span 
        className="absolute bottom-2 left-3 text-lg"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      >
        📊
      </motion.span>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">📈</span>
        <h3 className="text-lg font-bold text-indigo-700">My Money Charts</h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-white/50 rounded-2xl p-1 gap-1">
          <TabsTrigger 
            value="trend" 
            className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-400 data-[state=active]:to-purple-400 data-[state=active]:text-white text-indigo-600 gap-1"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Line</span>
          </TabsTrigger>
          <TabsTrigger 
            value="breakdown" 
            className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-400 data-[state=active]:to-teal-400 data-[state=active]:text-white text-indigo-600 gap-1"
          >
            <PieChartIcon className="h-4 w-4" />
            <span className="text-xs">Pie</span>
          </TabsTrigger>
          <TabsTrigger 
            value="weekly" 
            className="flex-1 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-400 data-[state=active]:to-emerald-400 data-[state=active]:text-white text-indigo-600 gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Bar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="mt-3">
          <div className="bg-white/60 rounded-2xl p-3">
            <BalanceWaveChart kidId={kidId} variant="playful" />
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-3">
          <div className="bg-white/60 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🥧</span>
              <h4 className="text-sm font-medium text-indigo-700">My Money Buckets</h4>
            </div>
            <div className="h-36">
              {bucketData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bucketData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {bucketData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "linear-gradient(135deg, #E0E7FF, #D1FAE5)",
                        border: "2px solid #6366F1",
                        borderRadius: "12px",
                        color: "#4F46E5",
                        fontWeight: "bold",
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `$${value.toFixed(2)}`,
                        `${props.payload.emoji} ${name}`
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-indigo-400">
                  <span className="text-3xl mb-2">🎨</span>
                  <span className="text-sm">Add money to see your buckets!</span>
                </div>
              )}
            </div>
            {/* Bucket legend */}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {bucketData.map((entry) => (
                <motion.div 
                  key={entry.name} 
                  className="flex items-center gap-1 bg-white/70 rounded-full px-2 py-1"
                  whileHover={{ scale: 1.1 }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs">{entry.emoji}</span>
                  <span className="text-xs text-indigo-600">{entry.name}</span>
                  <span className="text-xs font-bold text-indigo-700">${entry.value.toFixed(0)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-3">
          <div className="bg-white/60 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📊</span>
              <h4 className="text-sm font-medium text-indigo-700">This Week's Money</h4>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <XAxis 
                    dataKey="day" 
                    stroke="#6366F140" 
                    tick={{ fill: "#6366F1", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      background: "linear-gradient(135deg, #D1FAE5, #E0FFFF)",
                      border: "2px solid #10B981",
                      borderRadius: "12px",
                      color: "#059669",
                      fontWeight: "bold",
                    }}
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(2)}`,
                      name === "earned" ? "✅ Earned" : "💸 Spent"
                    ]}
                  />
                  <Bar dataKey="earned" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="spent" fill="#6366F1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              <motion.div 
                className="flex items-center gap-1 bg-emerald-100 rounded-full px-3 py-1"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm">✅</span>
                <span className="text-xs text-emerald-700 font-medium">Earned</span>
              </motion.div>
              <motion.div 
                className="flex items-center gap-1 bg-indigo-100 rounded-full px-3 py-1"
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-sm">💸</span>
                <span className="text-xs text-indigo-700 font-medium">Spent</span>
              </motion.div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
