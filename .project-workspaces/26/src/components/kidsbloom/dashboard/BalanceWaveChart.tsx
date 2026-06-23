import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";


interface BalanceWaveChartProps {
  kidId: string;
  variant: "playful" | "modern";
  isDarkMode?: boolean;
}

// Color options for kids to choose from
const WAVE_COLORS = [
  { name: "purple", color: "#8B5CF6", label: "💜" },
  { name: "pink", color: "#EC4899", label: "💗" },
  { name: "blue", color: "#3B82F6", label: "💙" },
  { name: "green", color: "#10B981", label: "💚" },
  { name: "orange", color: "#F97316", label: "🧡" },
  { name: "cyan", color: "#06B6D4", label: "💎" },
];

export const BalanceWaveChart = ({ kidId, variant, isDarkMode = false }: BalanceWaveChartProps) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>("purple");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const isPlayful = variant === "playful";

  // Fetch transactions and color preference
  useEffect(() => {
    const fetchData = async () => {
      // Fetch transactions - same as parent chart (limit 30, per transaction)
      const { data: txData } = await supabase
        .from("kid_transactions")
        .select("*")
        .eq("kid_id", kidId)
        .order("transaction_date", { ascending: true })
        .limit(30);

      if (txData) setTransactions(txData);

      // Fetch color preference
      const { data: profile } = await supabase
        .from("kids_profiles")
        .select("chart_color")
        .eq("id", kidId)
        .single();

      if (profile?.chart_color) {
        setSelectedColor(profile.chart_color);
      }
    };

    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`balance-wave-${kidId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kid_transactions',
          filter: `kid_id=eq.${kidId}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [kidId]);

  // Save color preference
  const handleColorChange = async (colorName: string) => {
    setSelectedColor(colorName);
    setShowColorPicker(false);
    
    await supabase
      .from("kids_profiles")
      .update({ chart_color: colorName })
      .eq("id", kidId);
  };

  // Process balance data - SAME logic as parent chart (running balance per transaction)
  let runningBalance = 0;
  const balanceData = transactions.map(tx => {
    const amount = tx.type === "spending" || tx.type === "withdrawal" ? -tx.amount : tx.amount;
    runningBalance += amount;
    return {
      date: new Date(tx.transaction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      balance: runningBalance,
    };
  });

  // Get the actual color hex value
  const activeColorObj = WAVE_COLORS.find(c => c.name === selectedColor) || WAVE_COLORS[0];
  const waveColor = activeColorObj.color;

  // Unique gradient ID to avoid conflicts
  const gradientId = `balanceGradient-${kidId}-${selectedColor}`;

  return (
    <div className="relative">
      {/* Header with color picker */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isPlayful ? "🌊" : "📈"}</span>
          <h4 className={`text-sm font-medium ${
            isPlayful 
              ? "text-indigo-700" 
              : isDarkMode ? "text-white/80" : "text-slate-600"
          }`}>
            {isPlayful ? "My Money Wave" : "Balance Over Time"}
          </h4>
        </div>
        
        {/* Color picker toggle - multicolored palette */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className={`p-1.5 rounded-full transition-all ${
            isPlayful 
              ? "bg-white/60 hover:bg-white/80"
              : isDarkMode 
                ? "bg-white/10 hover:bg-white/20"
                : "bg-slate-100 hover:bg-slate-200"
          }`}
          title="Pick wave color"
        >
          {/* Custom multicolored palette icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            {/* Palette base shape */}
            <path 
              d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.2-.64-1.67-.08-.1-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"
              fill={isDarkMode ? "#374151" : "#f3f4f6"}
              stroke={isDarkMode ? "#6b7280" : "#d1d5db"}
              strokeWidth="1"
            />
            {/* Colorful paint dots */}
            <circle cx="7.5" cy="11.5" r="1.5" fill="#EC4899" />
            <circle cx="10.5" cy="7.5" r="1.5" fill="#8B5CF6" />
            <circle cx="15" cy="7.5" r="1.5" fill="#3B82F6" />
            <circle cx="17" cy="11" r="1.5" fill="#10B981" />
          </svg>
        </button>
      </div>

      {/* Color picker dropdown */}
      {showColorPicker && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute right-0 top-8 z-10 flex gap-1.5 p-2 rounded-xl shadow-lg ${
            isPlayful 
              ? "bg-white/90 backdrop-blur-sm border-2 border-indigo-200"
              : isDarkMode
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-slate-200"
          }`}
        >
          {WAVE_COLORS.map((colorOption) => (
            <button
              key={colorOption.name}
              onClick={() => handleColorChange(colorOption.name)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110 ${
                selectedColor === colorOption.name ? "ring-2 ring-offset-2 ring-indigo-500" : ""
              }`}
              style={{ backgroundColor: colorOption.color + "30" }}
              title={colorOption.name}
            >
              {colorOption.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Chart */}
      <div className="h-40">
        {balanceData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={waveColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={waveColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke={isPlayful ? "#6366F140" : isDarkMode ? "#ffffff40" : "#10b98140"}
                tick={{ 
                  fill: isPlayful ? "#6366F1" : isDarkMode ? "#ffffff80" : "#047857", 
                  fontSize: isPlayful ? 9 : 10 
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={isPlayful ? {
                  background: "linear-gradient(135deg, #E0E7FF, #F3E8FF)",
                  border: `2px solid ${waveColor}`,
                  borderRadius: "12px",
                  color: "#4F46E5",
                  fontWeight: "bold",
                } : {
                  background: isDarkMode ? "#1f2937" : "#ffffff",
                  border: isDarkMode ? "1px solid #374151" : `1px solid ${waveColor}40`,
                  borderRadius: "8px",
                  color: isDarkMode ? "#fff" : "#065f46",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke={waveColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className={`h-full flex flex-col items-center justify-center ${
            isPlayful ? "text-indigo-600" : isDarkMode ? "text-white/60" : "text-slate-500"
          }`}>
            {isPlayful ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-2"
              >
                💰
              </motion.div>
            ) : null}
            <span className="text-sm font-medium">No transactions yet</span>
          </div>
        )}
      </div>
    </div>
  );
};
