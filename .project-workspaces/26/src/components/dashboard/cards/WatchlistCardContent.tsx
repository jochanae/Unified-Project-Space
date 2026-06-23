import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  RefreshCw,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMarketData,
  popularSymbols,
  StockQuote,
} from "@/hooks/useMarketData";
import { toast } from "sonner";

const DEFAULT_WATCHLIST = ["SPY", "QQQ", "DIA", "VTI"];
// Compliance scope: indexes + ETFs only, mirrors Bloom's market lens allowlist.
const ALLOWED = new Set([
  "NDX","QQQ","IXIC","GSPC","SPY","VOO","DJI","DIA","RUT","IWM","VIX",
  "XLK","XLF","XLE","XLV","XLY","XLP","XLI","XLU","XLB","XLRE","XLC",
  "VTI","VEA","VWO","AGG","TLT","GLD","SLV",
]);

export const WatchlistCardContent = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [loadingList, setLoadingList] = useState(true);
  const [newSymbol, setNewSymbol] = useState("");
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { fetchMultipleQuotes, loading } = useMarketData();

  // Load watchlist from DB (so Bloom can see it server-side)
  const loadWatchlist = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("bloom_watchlist")
      .select("symbol")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("watchlist load error", error);
      setLoadingList(false);
      return;
    }
    let symbols = (data ?? []).map((r: { symbol: string }) => r.symbol);
    // Seed defaults on first run
    if (symbols.length === 0) {
      const rows = DEFAULT_WATCHLIST.map((s) => ({ user_id: user.id, symbol: s }));
      await supabase.from("bloom_watchlist").insert(rows);
      symbols = [...DEFAULT_WATCHLIST];
    }
    setWatchlist(symbols);
    setLoadingList(false);
  }, [user]);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  // Fetch quotes + refresh every 60s
  useEffect(() => {
    if (watchlist.length === 0) return;
    const fetchAll = async () => {
      const results = await fetchMultipleQuotes(watchlist);
      setQuotes(results);
    };
    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => clearInterval(id);
  }, [watchlist, fetchMultipleQuotes]);

  const addSymbol = async (raw: string) => {
    const upper = raw.toUpperCase().trim();
    if (!upper || !user) return;
    if (!ALLOWED.has(upper)) {
      toast.error("Only indexes and ETFs supported (e.g., SPY, QQQ, VTI).");
      return;
    }
    if (watchlist.includes(upper)) {
      setNewSymbol("");
      setOpen(false);
      return;
    }
    const { error } = await supabase
      .from("bloom_watchlist")
      .insert({ user_id: user.id, symbol: upper });
    if (error) {
      toast.error("Could not add symbol.");
      return;
    }
    setWatchlist((prev) => [...prev, upper]);
    setNewSymbol("");
    setOpen(false);
  };

  const removeSymbol = async (symbol: string) => {
    if (!user) return;
    await supabase
      .from("bloom_watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol);
    setWatchlist((prev) => prev.filter((s) => s !== symbol));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    const results = await fetchMultipleQuotes(watchlist);
    setQuotes(results);
    setRefreshing(false);
  };

  const fmtPrice = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  const fmtChange = (c: number, p: number) => {
    const s = c >= 0 ? "+" : "";
    return `${s}${c.toFixed(2)} (${s}${p.toFixed(2)}%)`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Indexes & ETFs Bloom references
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing || loading || watchlist.length === 0}
            className="h-7 w-7"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (refreshing || loading) && "animate-spin",
              )}
            />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Symbol</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., SPY, QQQ, VTI"
                    value={newSymbol}
                    onChange={(e) =>
                      setNewSymbol(e.target.value.toUpperCase())
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && addSymbol(newSymbol)
                    }
                  />
                  <Button onClick={() => addSymbol(newSymbol)} disabled={!newSymbol}>
                    Add
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Popular (indexes + ETFs only):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {popularSymbols
                      .filter((s) => !watchlist.includes(s.symbol))
                      .slice(0, 8)
                      .map((s) => (
                        <Badge
                          key={s.symbol}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => addSymbol(s.symbol)}
                        >
                          {s.symbol}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loadingList ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : watchlist.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <Activity className="h-6 w-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No symbols yet</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setOpen(true)}
            className="mt-0.5 h-auto p-0 text-xs"
          >
            Add your first
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {watchlist.map((symbol) => {
            const q = quotes.get(symbol);
            const isLoading = loading && !q;
            const up = q ? q.change >= 0 : true;
            return (
              <div
                key={symbol}
                className="group flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                      q && up && "bg-emerald-500/10",
                      q && !up && "bg-rose-500/10",
                      !q && "bg-muted",
                    )}
                  >
                    {q ? (
                      up ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                      )
                    ) : (
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-semibold text-xs">{symbol}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-right">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-3 w-14 mb-0.5" />
                        <Skeleton className="h-2.5 w-16" />
                      </>
                    ) : q ? (
                      <>
                        <p className="font-semibold text-xs">{fmtPrice(q.price)}</p>
                        <p
                          className={cn(
                            "text-[10px] font-medium",
                            up ? "text-emerald-500" : "text-rose-500",
                          )}
                        >
                          {fmtChange(q.change, q.changePercent)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">—</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSymbol(symbol)}
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Refreshes every minute • Delayed quotes
          </p>
        </div>
      )}
    </div>
  );
};
