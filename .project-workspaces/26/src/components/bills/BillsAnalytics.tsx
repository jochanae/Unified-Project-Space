import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from "date-fns";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  status: string;
  is_recurring: boolean;
}

interface BillsAnalyticsProps {
  bills: Bill[];
  selectedMonth?: Date;
}

const categoryColors: Record<string, string> = {
  utilities: '#f59e0b',
  subscriptions: '#8b5cf6',
  insurance: '#3b82f6',
  rent: '#ef4444',
  phone: '#10b981',
  internet: '#06b6d4',
  streaming: '#ec4899',
  gym: '#84cc16',
  transportation: '#f97316',
  loans: '#6366f1',
  credit_card: '#14b8a6',
  other: '#6b7280',
};

const BillsAnalytics = ({ bills, selectedMonth }: BillsAnalyticsProps) => {
  const viewMonth = selectedMonth || new Date();
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const lastMonthStart = startOfMonth(subMonths(viewMonth, 1));
  const lastMonthEnd = endOfMonth(subMonths(viewMonth, 1));

  // Current (selected) month bills
  const currentMonthBills = bills.filter(bill => 
    isWithinInterval(new Date(bill.due_date), { start: monthStart, end: monthEnd })
  );

  // Previous month bills (relative to selected)
  const lastMonthBills = bills.filter(bill => 
    isWithinInterval(new Date(bill.due_date), { start: lastMonthStart, end: lastMonthEnd })
  );

  const currentTotal = currentMonthBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const lastTotal = lastMonthBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const monthlyChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

  // Category breakdown - scoped to selected month
  const categoryTotals = currentMonthBills.reduce((acc, bill) => {
    const category = bill.category || 'other';
    acc[category] = (acc[category] || 0) + Number(bill.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      value,
      color: categoryColors[name] || categoryColors.other,
    }))
    .sort((a, b) => b.value - a.value);

  // Recurring vs One-time - scoped to selected month
  const recurringTotal = currentMonthBills.filter(b => b.is_recurring).reduce((sum, b) => sum + Number(b.amount), 0);
  const oneTimeTotal = currentMonthBills.filter(b => !b.is_recurring).reduce((sum, b) => sum + Number(b.amount), 0);
  const totalBillsAmount = recurringTotal + oneTimeTotal;

  // Top 5 expenses - scoped to selected month
  const topExpenses = [...currentMonthBills]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  const monthLabel = format(viewMonth, 'MMMM yyyy');

  return (
    <div className="space-y-4">
      {/* Monthly Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">${currentTotal.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">{monthLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            {monthlyChange >= 0 ? (
              <TrendingUp className="h-6 w-6 mx-auto text-destructive mb-2" />
            ) : (
              <TrendingDown className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
            )}
            <p className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-destructive' : 'text-emerald-500'}`}>
              {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">vs Prior Month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring vs One-time */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Bill Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Recurring</span>
                <span className="font-medium">${recurringTotal.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${totalBillsAmount > 0 ? (recurringTotal / totalBillsAmount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>One-time</span>
                <span className="font-medium">${oneTimeTotal.toFixed(0)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${totalBillsAmount > 0 ? (oneTimeTotal / totalBillsAmount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryData.slice(0, 4).map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="flex-1">{cat.name}</span>
                    <span className="font-medium">${cat.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No data yet</p>
          )}
        </CardContent>
      </Card>

      {/* Top Expenses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {topExpenses.length > 0 ? (
            <div className="space-y-3">
              {topExpenses.map((bill, index) => (
                <div key={bill.id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{bill.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {bill.category?.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="font-bold">${Number(bill.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No bills for {monthLabel}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillsAnalytics;