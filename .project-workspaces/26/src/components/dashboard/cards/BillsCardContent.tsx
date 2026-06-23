import { useEffect, useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Clock, Bell, Zap, Square, CheckSquare, Eye, EyeOff, CalendarClock, Plus, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isPast, isToday, addDays, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import QuickAddBillsModal from "@/components/bills/QuickAddBillsModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  is_autopay: boolean;
  is_recurring: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
  last_paid_date: string | null;
  scheduled_payment_date: string | null;
  remaining_balance: number | null;
  end_date?: string | null;
  frequency?: string;
  is_projected?: boolean;
}

// Parse date string as local date to avoid UTC timezone shifting
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const BillsCardContent = () => {
  const { user } = useAuth();
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const fetchBillsData = async () => {
    if (!user) return;

    // Fetch ALL bills (same as Bills page) to apply consistent monthly logic
    const { data, error } = await supabase
      .from('bills')
      .select('id, name, amount, due_date, status, is_autopay, is_recurring, reminder_enabled, reminder_days_before, last_paid_date, scheduled_payment_date, remaining_balance, end_date, frequency')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (!error && data) {
      setAllBills(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBillsData();
  }, [user]);

  // Real-time subscription for bills
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-bills-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBillsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Apply the same monthly filtering & deduplication logic as the Bills page
  const monthlyBills = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const selectedYear = now.getFullYear();
    const selectedMonthNum = now.getMonth();

    const result: Bill[] = [];
    const seenIds = new Set<string>();
    const namesInMonth = new Set<string>();
    const billsByName = new Map<string, Bill[]>();

    // First pass: bills that naturally fall in this month
    for (const bill of allBills) {
      const dueDate = parseLocalDate(bill.due_date);
      if (dueDate >= monthStart && dueDate <= monthEnd) {
        const key = bill.name.toLowerCase();
        if (!billsByName.has(key)) billsByName.set(key, []);
        billsByName.get(key)!.push(bill);
        seenIds.add(bill.id);
        namesInMonth.add(key);
      }
    }

    // Deduplicate: if same bill name has both paid and pending, only show pending
    for (const [, sameBills] of billsByName) {
      if (sameBills.length > 1) {
        const hasPending = sameBills.some(b => b.status === 'pending' || b.status === 'overdue');
        if (hasPending) {
          for (const b of sameBills) {
            if (b.status !== 'paid') result.push(b);
          }
        } else {
          for (const b of sameBills) result.push(b);
        }
      } else {
        result.push(sameBills[0]);
      }
    }

    // Second pass: project recurring bills that don't have an instance this month
    for (const bill of allBills) {
      if (seenIds.has(bill.id)) continue;
      if (!bill.is_recurring) continue;
      if (namesInMonth.has(bill.name.toLowerCase())) continue;

      const dueDate = parseLocalDate(bill.due_date);
      const billMonth = dueDate.getFullYear() * 12 + dueDate.getMonth();
      const viewMonth = selectedYear * 12 + selectedMonthNum;
      if (billMonth > viewMonth) continue;

      if (bill.end_date) {
        const endDate = parseLocalDate(bill.end_date);
        const projectedDate = new Date(selectedYear, selectedMonthNum, 1);
        if (projectedDate > endDate) continue;
      }

      const dayOfMonth = dueDate.getDate();
      const lastDayOfMonth = endOfMonth(new Date(selectedYear, selectedMonthNum, 1)).getDate();
      const projectedDay = Math.min(dayOfMonth, lastDayOfMonth);
      const projectedDateStr = `${selectedYear}-${String(selectedMonthNum + 1).padStart(2, '0')}-${String(projectedDay).padStart(2, '0')}`;

      result.push({
        ...bill,
        due_date: projectedDateStr,
        status: 'pending',
        last_paid_date: null,
        is_projected: true,
      });
      seenIds.add(bill.id);
      namesInMonth.add(bill.name.toLowerCase());
    }

    return result;
  }, [allBills]);

  const pendingBills = useMemo(() => monthlyBills.filter(b => b.status !== 'paid'), [monthlyBills]);
  const paidBills = useMemo(() => monthlyBills.filter(b => b.status === 'paid'), [monthlyBills]);

  const handleMarkPaid = async (bill: Bill) => {
    if (!user) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }
    
    setMarkingPaid(bill.id);
    
    try {
      const paidDate = new Date().toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from('bills')
        .update({ 
          status: 'paid',
          last_paid_date: paidDate
        })
        .eq('id', bill.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { data: paymentData, error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: bill.id,
          user_id: user.id,
          amount: bill.amount,
          paid_date: paidDate,
          payment_method: 'manual'
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // Create next recurring bill occurrence if applicable
      if (bill.is_recurring) {
        const currentDueDate = new Date(bill.due_date);
        let nextDueDate: Date;

        const freq = bill.frequency || 'monthly';
        switch (freq) {
          case 'weekly': nextDueDate = addDays(currentDueDate, 7); break;
          case 'biweekly': nextDueDate = addDays(currentDueDate, 14); break;
          case 'quarterly':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'semi_annual':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'annual':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const billEndDate = bill.end_date;
        const shouldCreateNext = !billEndDate || nextDueDate <= new Date(billEndDate + 'T23:59:59');

        if (shouldCreateNext) {
          const nextDateStr = nextDueDate.toISOString().split('T')[0];

          const { data: existingNext } = await supabase
            .from('bills')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', bill.name)
            .in('status', ['pending', 'overdue'])
            .gte('due_date', nextDateStr)
            .limit(1);

          if (!existingNext || existingNext.length === 0) {
            const { data: fullBill } = await supabase
              .from('bills')
              .select('name, amount, category, frequency, is_recurring, is_autopay, is_variable_amount, reminder_enabled, reminder_days_before, autopay_source, end_date, total_payments')
              .eq('id', bill.id)
              .single();

            if (fullBill) {
              await supabase
                .from('bills')
                .insert({
                  user_id: user.id,
                  name: fullBill.name,
                  amount: fullBill.amount,
                  category: fullBill.category as any,
                  due_date: nextDateStr,
                  frequency: fullBill.frequency as any,
                  is_recurring: true,
                  is_autopay: fullBill.is_autopay,
                  is_variable_amount: fullBill.is_variable_amount,
                  reminder_enabled: fullBill.reminder_enabled,
                  reminder_days_before: fullBill.reminder_days_before,
                  autopay_source: fullBill.autopay_source,
                  end_date: fullBill.end_date,
                  total_payments: fullBill.total_payments,
                  status: 'pending',
                  remaining_balance: fullBill.amount,
                });
            }
          }
        }
      }

      fetchBillsData();

      toast.success(`${bill.name} marked as paid!`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await supabase
                .from('bills')
                .update({ status: 'pending', last_paid_date: bill.last_paid_date })
                .eq('id', bill.id)
                .eq('user_id', user.id);

              if (paymentData?.id) {
                await supabase
                  .from('bill_payments')
                  .delete()
                  .eq('id', paymentData.id);
              }

              toast.success(`${bill.name} restored to unpaid`);
              fetchBillsData();
            } catch (error) {
              console.error('Error undoing payment:', error);
              toast.error('Failed to undo payment');
            }
          },
        },
        duration: 5000,
      });
    } catch (error) {
      console.error('Error marking bill as paid:', error);
      toast.error('Failed to mark bill as paid');
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-1.5">
        <div className="h-8 bg-muted animate-pulse rounded-lg" />
        <div className="h-8 bg-muted animate-pulse rounded-lg" />
        <div className="h-8 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (pendingBills.length === 0 && paidBills.length === 0) {
    return (
      <div className="text-center p-3 rounded-lg bg-gradient-to-br from-primary/10 to-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-1" />
        <p className="text-sm font-semibold text-green-600">All Bills Paid!</p>
        <p className="text-[10px] text-muted-foreground">No upcoming bills</p>
      </div>
    );
  }

  const getStatusInfo = (bill: Bill) => {
    const dueDate = new Date(bill.due_date);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Overdue" };
    }
    if (isToday(dueDate)) {
      return { color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock, label: "Today" };
    }
    if (daysUntilDue <= 3) {
      return { color: "text-amber-500", bg: "bg-amber-500/10", icon: Bell, label: `${daysUntilDue}d` };
    }
    return { color: "text-muted-foreground", bg: "bg-muted/50", icon: Clock, label: format(dueDate, 'MMM d') };
  };

  // Calculate weekly total
  const now = new Date();
  const weekFromNow = addDays(now, 7);
  const weeklyBills = pendingBills.filter(bill => {
    const dueDate = new Date(bill.due_date);
    return isWithinInterval(dueDate, { start: now, end: weekFromNow }) || isPast(dueDate);
  });
  const weeklyTotal = weeklyBills.reduce((sum, bill) => sum + Number(bill.amount), 0);
  const totalDue = pendingBills.reduce((sum, bill) => sum + Number(bill.amount), 0);

  const displayBills = showPaid ? paidBills : pendingBills;

  return (
    <div className="space-y-2">
      {/* Summary Stats - Compact */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-1.5 rounded-lg bg-muted/50">
          <p className="text-[9px] text-muted-foreground">This Week</p>
          <p className="text-sm font-bold">${weeklyTotal.toFixed(0)}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-muted/50">
          <p className="text-[9px] text-muted-foreground">Total Due</p>
          <p className="text-sm font-bold">${totalDue.toFixed(0)}</p>
        </div>
      </div>

      {/* Toggle for Paid/Pending */}
      <div className="flex gap-1">
        <button
          onClick={() => setShowPaid(false)}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            !showPaid 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Upcoming ({pendingBills.length})
        </button>
        <button
          onClick={() => setShowPaid(true)}
          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            showPaid 
              ? "bg-emerald-500 text-white" 
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          Paid ({paidBills.length})
        </button>
      </div>

      {/* Bill Checklist */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              {showPaid ? "Recently Paid" : "Upcoming Bills"}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-0.5">
                  <Info className="h-3 w-3 text-muted-foreground/60" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 text-xs">
                <p className="font-semibold mb-1.5">How bills are categorized:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li><span className="font-medium text-foreground">Recurring:</span> Bills that repeat automatically</li>
                  <li><span className="font-medium text-foreground">Variable:</span> Amounts that change (utilities, credit cards)</li>
                </ul>
                <p className="mt-1.5 text-muted-foreground/80 italic">Quick Add presets these based on bill type.</p>
              </PopoverContent>
            </Popover>
          </div>
          {!showPaid && (
            <button
              onClick={() => setQuickAddOpen(true)}
              className="flex items-center gap-0.5 text-[10px] text-primary hover:text-primary/80 transition-colors"
              title="Quick add bills"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          )}
        </div>
        {displayBills.length === 0 ? (
          <div className="text-center py-2 text-[10px] text-muted-foreground">
            {showPaid ? "No paid bills yet" : "No upcoming bills"}
          </div>
        ) : (
          displayBills.slice(0, 5).map((bill) => {
            const status = showPaid 
              ? { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, label: "Paid" }
              : getStatusInfo(bill);
            const StatusIcon = status.icon;
            const isPaying = markingPaid === bill.id;
            
            return (
              <div 
                key={bill.id}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg ${status.bg} group`}
              >
                {/* Checkbox - only show for pending bills */}
                {!showPaid ? (
                  <button
                    onClick={() => {
                      toast(`Mark ${bill.name} as paid for $${Number(bill.amount).toFixed(0)}?`, {
                        action: {
                          label: "Confirm",
                          onClick: () => handleMarkPaid(bill),
                        },
                        cancel: {
                          label: "Cancel",
                          onClick: () => {},
                        },
                        duration: 8000,
                      });
                    }}
                    disabled={isPaying || bill.is_projected}
                    className="flex-shrink-0 p-0.5 rounded hover:bg-green-500/20 transition-colors disabled:opacity-50"
                    title={bill.is_projected ? "Projected bill" : "Mark as paid"}
                  >
                    {isPaying ? (
                      <div className="h-4 w-4 border-2 border-green-500 rounded animate-pulse" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
                    )}
                  </button>
                ) : (
                  <CheckSquare className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                )}

                {/* Bill Info */}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs truncate max-w-[80px]">{bill.name}</span>
                    {bill.is_autopay && (
                      <Zap className="h-3 w-3 text-primary flex-shrink-0" />
                    )}
                    {bill.scheduled_payment_date && !showPaid && (
                      <span title={`Scheduled: ${format(new Date(bill.scheduled_payment_date), 'MMM d')}`}>
                        <CalendarClock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                      </span>
                    )}
                    {bill.status === 'partially_paid' && (
                      <Badge variant="outline" className="text-[8px] h-4 px-1 text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">
                        Partial
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-medium">
                      ${bill.status === 'partially_paid' && bill.remaining_balance !== null 
                        ? Number(bill.remaining_balance).toFixed(0) 
                        : Number(bill.amount).toFixed(0)}
                    </span>
                    <span className={`text-[9px] ${status.color}`}>{status.label}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Remaining count */}
      {displayBills.length > 5 && (
        <p className="text-[9px] text-center text-muted-foreground">
          +{displayBills.length - 5} more {showPaid ? "paid" : "upcoming"} bills
        </p>
      )}

      {/* Quick Add Modal */}
      <QuickAddBillsModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={fetchBillsData}
      />
    </div>
  );
};
