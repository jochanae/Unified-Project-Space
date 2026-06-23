import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usePriceAlerts, type PriceAlert } from "@/hooks/usePriceAlerts";
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { popularSymbols } from "@/hooks/useMarketData";

const formatPrice = (price: number) =>
  price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

export function PriceAlertsCardContent() {
  const { activeAlerts, triggeredAlerts, isLoading, createAlert, deleteAlert } = usePriceAlerts();
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("SPY");
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetPrice) return;
    setSubmitting(true);
    const res = await createAlert(symbol, parseFloat(targetPrice), direction, notes || undefined);
    setSubmitting(false);
    if (res) {
      setTargetPrice("");
      setNotes("");
      setOpen(false);
    }
  };

  const Row = ({ alert }: { alert: PriceAlert }) => (
    <div
      className={cn(
        "group flex items-center justify-between p-2.5 rounded-lg transition-colors",
        alert.is_triggered
          ? "bg-amber-500/10 border border-amber-500/30"
          : "bg-muted/40 hover:bg-muted/60",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
            alert.direction === "above" ? "bg-emerald-500/10" : "bg-rose-500/10",
          )}
        >
          {alert.direction === "above" ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-xs">{alert.symbol}</p>
            {alert.is_triggered && (
              <Badge
                variant="outline"
                className="text-[9px] px-1 py-0 text-amber-500 border-amber-500/40"
              >
                Triggered
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {alert.direction === "above" ? "Above" : "Below"} {formatPrice(alert.target_price)}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteAlert(alert.id)}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Bell className="h-3 w-3" />
          <span>{activeAlerts.length} active</span>
          {triggeredAlerts.length > 0 && (
            <span className="text-amber-500">· {triggeredAlerts.length} hit</span>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Create Price Alert</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pa-symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="pa-symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {popularSymbols.map((s) => (
                        <SelectItem key={s.symbol} value={s.symbol}>
                          {s.symbol} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pa-price">Target Price</Label>
                  <Input
                    id="pa-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="450.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Trigger When Price Goes</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as "above" | "below")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Above target
                      </span>
                    </SelectItem>
                    <SelectItem value="below">
                      <span className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-rose-500" /> Below target
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa-notes">Notes (optional)</Label>
                <Input
                  id="pa-notes"
                  placeholder="e.g., Rebalance signal"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Create Alert"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Educational tracking only. Not investment advice.
              </p>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {isLoading ? (
          <>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </>
        ) : activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
            <p className="text-xs">No alerts set</p>
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(true);
              }}
              className="mt-0.5 h-auto p-0 text-[11px]"
            >
              Add your first alert
            </Button>
          </div>
        ) : (
          <>
            {activeAlerts.slice(0, 4).map((a) => <Row key={a.id} alert={a} />)}
            {triggeredAlerts.slice(0, 2).map((a) => <Row key={a.id} alert={a} />)}
          </>
        )}
      </div>
    </div>
  );
}
