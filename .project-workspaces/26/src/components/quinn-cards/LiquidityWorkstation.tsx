import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, TrendingDown, TrendingUp, Loader2, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiquidityBill {
  bill_id?: string;
  name: string;
  amount: number;
  due_date: string; // ISO date (YYYY-MM-DD)
  deferrable?: boolean;
}

export interface LiquidityIncomeEvent {
  label: string;
  amount: number;
  date: string;
}

export interface LiquidityMetadata {
  show_liquidity_timeline?: boolean;
  cash_on_hand?: number;
  bills?: LiquidityBill[];
  income_events?: LiquidityIncomeEvent[];
}

interface LiquidityWorkstationProps {
  metadata: LiquidityMetadata;
}

// ─── Date helpers (timezone-safe, mirrors project parseLocalDate convention) ─

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function daysBetween(a: string, b: string): number {
  const ms = parseLocalDate(b).getTime() - parseLocalDate(a).getTime();
  return Math.round(ms / 86_400_000);
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const shortDate = (iso: string) =>
  parseLocalDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ─── Component ────────────────────────────────────────────────────────────────

export function LiquidityWorkstation({ metadata }: LiquidityWorkstationProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Live refresh: pull current cash + upcoming bills from DB.
  // Bloom's seeded metadata is the fallback used until the query resolves
  // (and persists if the user is signed-out / query fails).
  const { data: liveData, isLoading } = useQuery({
    queryKey: ["liquidity-workstation", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const today = formatLocalDate(new Date());
      const horizon = addDays(today, 14);

      const sb: any = supabase;
      const accountsRes = await sb
        .from("accounts")
        .select("balance, account_type, is_active")
        .eq("user_id", user!.id)
        .eq("is_active", true);

      const billsRes = await sb
        .from("bills")
        .select("id, name, amount, due_date, status")
        .eq("user_id", user!.id)
        .gte("due_date", today)
        .lte("due_date", horizon)
        .neq("status", "paid")
        .order("due_date", { ascending: true });

      // Cash = sum of liquid asset accounts (checking, savings, cash).
      const liquidTypes = new Set(["checking", "savings", "cash", "money_market"]);
      const cash = (accountsRes.data ?? [])
        .filter((a: any) => liquidTypes.has(a.account_type))
        .reduce((s: number, a: any) => s + Number(a.balance ?? 0), 0);

      const bills: LiquidityBill[] = (billsRes.data ?? []).map((b: any) => ({
        bill_id: b.id,
        name: b.name,
        amount: Number(b.amount),
        due_date: b.due_date,
        deferrable: !["mortgage", "rent"].some((k) => b.name.toLowerCase().includes(k)),
      }));

      return { cash, bills };
    },
  });

  // Source of truth: live data when available, Bloom's seeded metadata as fallback.
  const cashOnHand = liveData?.cash ?? metadata.cash_on_hand ?? 0;
  const baseBills: LiquidityBill[] = liveData?.bills?.length ? liveData.bills : metadata.bills ?? [];
  const incomeEvents: LiquidityIncomeEvent[] = metadata.income_events ?? [];

  // Local deferral simulation: bill_id (or fallback key) → days deferred
  const [deferrals, setDeferrals] = useState<Record<string, number>>({});
  const [applying, setApplying] = useState(false);

  // Reset deferrals when the underlying bills change (live refresh).
  useEffect(() => {
    setDeferrals({});
  }, [liveData?.bills?.length]);

  const billKey = (b: LiquidityBill, i: number) => b.bill_id ?? `${b.name}-${i}`;

  // Apply deferrals to the bill list to produce the "simulated" view.
  const simulatedBills = useMemo(() => {
    return baseBills.map((b, i) => {
      const k = billKey(b, i);
      const offset = deferrals[k] ?? 0;
      return { ...b, simulated_due_date: offset ? addDays(b.due_date, offset) : b.due_date, _key: k, _offset: offset };
    });
  }, [baseBills, deferrals]);

  const today = formatLocalDate(new Date());

  // Build 14-day timeline: each day carries its bills + income, and a running cash balance.
  const timeline = useMemo(() => {
    const days: Array<{
      date: string;
      bills: Array<{ name: string; amount: number; deferred: boolean }>;
      income: number;
      runningBalance: number;
      isCritical: boolean;
    }> = [];

    let running = cashOnHand;
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const dayBills = simulatedBills
        .filter((b) => b.simulated_due_date === date)
        .map((b) => ({ name: b.name, amount: b.amount, deferred: b._offset !== 0 }));
      const dayIncome = incomeEvents
        .filter((e) => e.date === date)
        .reduce((s, e) => s + e.amount, 0);

      const out = dayBills.reduce((s, b) => s + b.amount, 0);
      running = running + dayIncome - out;

      days.push({
        date,
        bills: dayBills,
        income: dayIncome,
        runningBalance: running,
        isCritical: running < 0 || (dayBills.length > 0 && running < 200),
      });
    }
    return days;
  }, [simulatedBills, cashOnHand, incomeEvents, today]);

  // Projected gap: lowest running balance over the window. Negative = shortfall.
  const projectedGap = useMemo(() => {
    const lowest = Math.min(cashOnHand, ...timeline.map((d) => d.runningBalance));
    return lowest;
  }, [cashOnHand, timeline]);

  const baseGap = useMemo(() => {
    let running = cashOnHand;
    let lowest = cashOnHand;
    for (let i = 0; i < 14; i++) {
      const date = addDays(today, i);
      const out = baseBills.filter((b) => b.due_date === date).reduce((s, b) => s + b.amount, 0);
      const inc = incomeEvents.filter((e) => e.date === date).reduce((s, e) => s + e.amount, 0);
      running = running + inc - out;
      if (running < lowest) lowest = running;
    }
    return lowest;
  }, [baseBills, cashOnHand, incomeEvents, today]);

  const gapImproved = projectedGap > baseGap;
  const hasDeferrals = Object.values(deferrals).some((v) => v !== 0);

  const handleDefer = useCallback((key: string, days: number) => {
    setDeferrals((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + days }));
  }, []);

  const handleResetBill = useCallback((key: string) => {
    setDeferrals((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleResetAll = useCallback(() => setDeferrals({}), []);

  const handleApply = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to apply changes");
      return;
    }
    const updates = simulatedBills.filter((b) => b._offset !== 0 && b.bill_id);
    if (updates.length === 0) {
      toast.error("No deferrals to apply");
      return;
    }
    setApplying(true);
    try {
      // Batch update — each bill gets its new due_date written.
      const sb: any = supabase;
      const results = await Promise.all(
        updates.map((b) =>
          sb
            .from("bills")
            .update({ due_date: b.simulated_due_date })
            .eq("id", b.bill_id!)
            .eq("user_id", user.id)
        )
      );
      const failed = results.filter((r: any) => r.error);
      if (failed.length > 0) {
        throw new Error(`${failed.length} bill(s) failed to update`);
      }
      toast.success(`Deferred ${updates.length} bill${updates.length > 1 ? "s" : ""}`);
      setDeferrals({});
      // Invalidate so live data refreshes.
      await queryClient.invalidateQueries({ queryKey: ["liquidity-workstation", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["bills"] });
    } catch (err: any) {
      console.error("Apply deferrals failed:", err);
      toast.error(err?.message || "Could not apply deferrals");
    } finally {
      setApplying(false);
    }
  }, [user, simulatedBills, queryClient]);

  // Don't render if there's nothing meaningful to show.
  if (baseBills.length === 0 && cashOnHand === 0) return null;

  return (
    <div className="mt-2 mb-1 mx-2 rounded-xl border border-[hsl(var(--quinn-champagne))]/20 bg-[hsl(160_30%_6%/0.6)] backdrop-blur-md overflow-hidden min-w-0 max-w-full">
      {/* Header strip */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[hsl(var(--quinn-champagne))]/15 bg-gradient-to-b from-[hsl(var(--quinn-champagne)/0.04)] to-transparent">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-champagne" />
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-champagne">
            14-Day Liquidity
          </span>
          {isLoading && <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Projected Gap</span>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-bold tabular-nums border",
              projectedGap < 0
                ? "bg-rose-950/40 text-rose-300 border-rose-500/40"
                : projectedGap < 500
                ? "bg-amber-950/40 text-amber-300 border-amber-500/40"
                : "bg-emerald-950/40 text-emerald-300 border-emerald-500/40"
            )}
          >
            {fmtUSD(projectedGap)}
            {hasDeferrals && gapImproved && (
              <TrendingUp className="ml-0.5 h-2.5 w-2.5" />
            )}
            {hasDeferrals && !gapImproved && (
              <TrendingDown className="ml-0.5 h-2.5 w-2.5" />
            )}
          </Badge>
        </div>
      </div>

      {/* Timeline strip — 14 day cells, auto-fit to width on narrow screens */}
      <div className="px-2 py-2.5 max-w-full overflow-hidden">
        <div
          className="grid gap-[2px] w-full max-w-full"
          style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
        >
          {timeline.map((day) => {
            const hasBills = day.bills.length > 0;
            const hasIncome = day.income > 0;
            const isCritical = day.isCritical;
            return (
              <div
                key={day.date}
                className={cn(
                  "relative flex flex-col items-center min-w-0 py-1 px-0.5 rounded-md transition-all",
                  isCritical && "bg-rose-950/30 ring-1 ring-rose-500/40",
                  hasBills && !isCritical && "bg-[hsl(var(--quinn-champagne))]/10 ring-1 ring-[hsl(var(--quinn-champagne))]/30",
                  !hasBills && !isCritical && "bg-white/[0.02]"
                )}
                title={`${shortDate(day.date)} — Balance: ${fmtUSD(day.runningBalance)}${
                  hasBills ? "\nBills: " + day.bills.map((b) => `${b.name} ${fmtUSD(b.amount)}`).join(", ") : ""
                }${hasIncome ? "\nIncome: " + fmtUSD(day.income) : ""}`}
              >
                <span
                  className={cn(
                    "text-[8px] font-semibold uppercase tracking-tight leading-none",
                    isCritical ? "text-rose-300" : hasBills ? "text-champagne" : "text-muted-foreground/70"
                  )}
                >
                  {parseLocalDate(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold tabular-nums leading-tight mt-0.5",
                    isCritical ? "text-rose-200" : "text-foreground/80"
                  )}
                >
                  {parseLocalDate(day.date).getDate()}
                </span>
                {/* Bill marker dot */}
                {hasBills && (
                  <span
                    className={cn(
                      "mt-1 h-1 w-1 rounded-full",
                      isCritical ? "bg-rose-400" : "bg-[hsl(var(--quinn-champagne))]"
                    )}
                  />
                )}
                {hasIncome && (
                  <span className="absolute -top-0.5 right-0.5 h-1 w-1 rounded-full bg-emerald-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bill deferral list */}
      {simulatedBills.length > 0 && (
        <div className="border-t border-[hsl(var(--quinn-champagne))]/15">
          <div className="px-3 pt-2 pb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-emerald">
              Bill Workbench
            </span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Cash: <span className="text-foreground/80 tabular-nums">{fmtUSD(cashOnHand)}</span>
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1">
            {simulatedBills.map((b) => {
              const deferred = b._offset !== 0;
              return (
                <div
                  key={b._key}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-2 py-1.5 rounded-md text-xs transition-colors min-w-0",
                    deferred ? "bg-[hsl(var(--quinn-champagne))]/10" : "bg-white/[0.02]"
                  )}
                >
                  <div className="flex-1 min-w-0 basis-[140px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium text-foreground/90 truncate min-w-0">{b.name}</span>
                      <span className="tabular-nums text-champagne font-semibold shrink-0">{fmtUSD(b.amount)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums truncate">
                      {shortDate(b.due_date)}
                      {deferred && (
                        <>
                          {" → "}
                          <span className="text-champagne font-semibold">
                            {shortDate(b.simulated_due_date)}
                          </span>
                          <span className="ml-1 text-emerald">+{b._offset}d</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
                    {b.deferrable !== false ? (
                      <>
                        {[3, 7, 14].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleDefer(b._key, d)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-champagne/80 hover:text-champagne hover:bg-[hsl(var(--quinn-champagne))]/15 transition-colors"
                            title={`Push ${d} days`}
                          >
                            +{d}d
                          </button>
                        ))}
                        {deferred && (
                          <button
                            type="button"
                            onClick={() => handleResetBill(b._key)}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                            title="Reset"
                          >
                            <RotateCcw className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-[8px] px-1 py-0 h-3.5 bg-rose-950/30 text-rose-300/80 border border-rose-500/20"
                      >
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apply / reset footer */}
          {hasDeferrals && (
            <div className="px-3 py-2 border-t border-[hsl(var(--quinn-champagne))]/20 bg-gradient-to-b from-transparent to-[hsl(var(--quinn-champagne)/0.05)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetAll}
                disabled={applying}
                className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Reset all
              </button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={applying}
                className="h-7 px-3 text-[11px] font-semibold gap-1 rounded-full border border-[hsl(var(--quinn-champagne)/0.55)] text-champagne bg-[hsl(var(--quinn-champagne)/0.12)] hover:bg-[hsl(var(--quinn-champagne)/0.22)] shadow-[0_0_12px_-4px_hsl(var(--quinn-champagne)/0.45)]"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
