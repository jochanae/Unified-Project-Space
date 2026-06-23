import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Minus, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AccountHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
}

interface BalanceHistory {
  id: string;
  balance: number;
  snapshot_date: string;
}

export function AccountHistoryModal({
  open,
  onOpenChange,
  accountId,
  accountName,
}: AccountHistoryModalProps) {
  const [history, setHistory] = useState<BalanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && accountId) {
      fetchHistory();
    }
  }, [open, accountId]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("account_balance_history")
      .select("id, balance, snapshot_date")
      .eq("account_id", accountId)
      .order("snapshot_date", { ascending: true });

    if (error) {
      console.error("Error fetching account history:", error);
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  const chartData = history.map((h) => ({
    date: format(new Date(h.snapshot_date), "MMM d"),
    balance: Number(h.balance),
  }));

  const latestBalance = history.length > 0 ? Number(history[history.length - 1].balance) : 0;
  const previousBalance = history.length > 1 ? Number(history[history.length - 2].balance) : latestBalance;
  const change = latestBalance - previousBalance;
  const changePercent = previousBalance > 0 ? ((change / previousBalance) * 100).toFixed(1) : "0";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-3xl">
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-4 px-4">
          <div className="mx-auto w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-4" />
        </div>

        <DrawerHeader className="flex-shrink-0 px-4 pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {accountName} History
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="space-y-4 pb-4">
            {/* Summary Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">${latestBalance.toLocaleString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-muted-foreground">Change</p>
                  <div className={`flex items-center gap-1 justify-end ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {change > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : change < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm sm:text-base">
                      {change >= 0 ? "+" : ""}${Math.abs(change).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">({changePercent}%)</p>
                </div>
              </div>
            </Card>

            {/* Chart */}
            {loading ? (
              <div className="h-40 sm:h-48 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : chartData.length > 1 ? (
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis 
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      className="text-xs"
                      tick={{ fontSize: 10 }}
                      width={45}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <Card className="p-6 text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Not enough history yet. Balance snapshots are recorded automatically.
                </p>
              </Card>
            )}

            {/* History List */}
            {history.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Balance History</h4>
                <div className="space-y-1.5">
                  {[...history].reverse().slice(0, 10).map((h, index) => {
                    const prevBalance = index < history.length - 1 ? Number([...history].reverse()[index + 1]?.balance || h.balance) : Number(h.balance);
                    const balanceChange = Number(h.balance) - prevBalance;
                    
                    return (
                      <div key={h.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground text-xs sm:text-sm">
                          {format(new Date(h.snapshot_date), "MMM d, yyyy")}
                        </span>
                        <div className="flex items-center gap-2 sm:gap-3">
                          {index < history.length - 1 && balanceChange !== 0 && (
                            <span className={`${balanceChange >= 0 ? "text-green-600" : "text-destructive"} text-xs`}>
                              {balanceChange >= 0 ? "+" : ""}{balanceChange.toLocaleString()}
                            </span>
                          )}
                          <span className="font-semibold text-sm">${Number(h.balance).toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {history.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing last 10 entries
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
