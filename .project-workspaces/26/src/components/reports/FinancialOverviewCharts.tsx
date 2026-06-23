import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, PieChartIcon } from "lucide-react";

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface FinancialOverviewChartsProps {
  trendData: MonthlyData[];
  categoryData: CategoryData[];
}

// Custom animated tooltip for line chart
const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
      >
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        ))}
        {payload.length === 2 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1 text-sm">
              {payload[0].value - payload[1].value >= 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={payload[0].value - payload[1].value >= 0 ? "text-emerald-500" : "text-red-500"}>
                Net: ${(payload[0].value - payload[1].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
  return null;
};

// Custom animated tooltip for bar chart
const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload[0]?.payload?.totalExpenses || 0;
    const percentage = total > 0 ? Math.round((payload[0].value / total) * 100) : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
      >
        <p className="font-semibold text-sm">{label}</p>
        <div className="flex items-center gap-2 mt-1">
          <DollarSign className="w-3 h-3 text-primary" />
          <span className="font-medium">${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </motion.div>
    );
  }
  return null;
};

// Custom animated tooltip for pie chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: payload[0].payload.color }}
          />
          <span className="font-semibold text-sm">{payload[0].name}</span>
        </div>
        <p className="text-lg font-bold mt-1">${payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="text-xs text-muted-foreground">
          {payload[0].payload.percent ? `${(payload[0].payload.percent * 100).toFixed(1)}%` : ''} of total
        </p>
      </motion.div>
    );
  }
  return null;
};

const FinancialOverviewCharts = ({ trendData, categoryData }: FinancialOverviewChartsProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartConfig = {
    income: { label: "Income", color: "hsl(142, 76%, 36%)" },
    expenses: { label: "Expenses", color: "hsl(346, 87%, 43%)" },
  };

  const avgIncome = trendData.length > 0 
    ? trendData.reduce((acc, d) => acc + d.income, 0) / trendData.length 
    : 0;
  const avgExpenses = trendData.length > 0 
    ? trendData.reduce((acc, d) => acc + d.expenses, 0) / trendData.length 
    : 0;

  // Calculate total for percentages
  const totalExpenses = categoryData.reduce((acc, d) => acc + d.value, 0);
  const enrichedCategoryData = categoryData.map(cat => ({
    ...cat,
    percent: totalExpenses > 0 ? cat.value / totalExpenses : 0,
    totalExpenses
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Check if there's any data to show
  const hasNoTrendData = trendData.every(d => d.income === 0 && d.expenses === 0);
  const hasNoCategoryData = categoryData.length === 0 || totalExpenses === 0;

  return (
    <div className="p-4 space-y-4">
      <motion.h2 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-lg font-semibold flex items-center gap-2"
      >
        <PieChartIcon className="w-5 h-5 text-primary" />
        Financial Overview
      </motion.h2>

      {/* Empty state when no data */}
      {hasNoTrendData && hasNoCategoryData && (
        <Card className="p-8 bg-muted/30 border-dashed">
          <div className="text-center">
            <PieChartIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-muted-foreground mb-1">No financial data for this period</h3>
            <p className="text-sm text-muted-foreground">
              Add transactions to see your spending trends and category breakdown
            </p>
          </div>
        </Card>
      )}
      
      {/* Income vs Expenses Trend */}
      {!hasNoTrendData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Income vs Expenses Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <LineChart data={trendData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(346, 87%, 43%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(346, 87%, 43%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }} 
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `$${v/1000}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    name="Income"
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(142, 76%, 36%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "hsl(142, 76%, 36%)", strokeWidth: 2, stroke: "#fff" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    name="Expenses"
                    stroke="hsl(346, 87%, 43%)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "hsl(346, 87%, 43%)", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "hsl(346, 87%, 43%)", strokeWidth: 2, stroke: "#fff" }}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    animationBegin={300}
                  />
                </LineChart>
              </ChartContainer>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-around mt-3 text-sm"
              >
                <div className="text-center p-2 rounded-lg bg-emerald-500/10">
                  <p className="text-muted-foreground text-xs">Avg Income</p>
                  <p className="font-semibold text-emerald-600">${avgIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-rose-500/10">
                  <p className="text-muted-foreground text-xs">Avg Expenses</p>
                  <p className="font-semibold text-rose-600">${avgExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className={`text-center p-2 rounded-lg ${avgIncome - avgExpenses >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                  <p className="text-muted-foreground text-xs">Avg Net</p>
                  <p className={`font-semibold ${avgIncome - avgExpenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ${(avgIncome - avgExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Top Spending Categories - only show if there's category data */}
      {!hasNoCategoryData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Top Spending Categories
            </CardTitle>
            <p className="text-xs text-muted-foreground">Based on your transactions</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-40 w-full">
              <BarChart data={enrichedCategoryData.slice(0, 5)} layout="vertical">
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(v) => `$${v}`}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }} 
                  width={80}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 8, 8, 0]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {enrichedCategoryData.slice(0, 5).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Category Distribution Pie - only show if there's category data */}
      {!hasNoCategoryData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-primary" />
              Category Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">Based on your transactions</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ChartContainer config={{}} className="h-44 w-44">
                <PieChart>
                  <Pie
                    data={enrichedCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={activeIndex !== null ? 70 : 65}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={1000}
                    animationEasing="ease-out"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                  >
                    {enrichedCategoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ 
                          filter: activeIndex === index ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                          transform: activeIndex === index ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center',
                          transition: 'all 0.2s ease-out'
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2">
                {enrichedCategoryData.slice(0, 5).map((cat, index) => (
                  <motion.div 
                    key={cat.name} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className={`flex items-center gap-2 text-sm p-2 rounded-lg transition-colors cursor-pointer ${
                      activeIndex === index ? 'bg-muted' : 'hover:bg-muted/50'
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1 truncate">{cat.name}</span>
                    <span className="font-medium">${cat.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-muted-foreground">
                      {(cat.percent * 100).toFixed(0)}%
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}
    </div>
  );
};

export default FinancialOverviewCharts;
