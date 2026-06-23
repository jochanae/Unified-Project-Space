import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMonths, addWeeks, addYears, startOfMonth, endOfMonth } from "date-fns";
import { DollarSign, CheckCircle2, Receipt, TrendingUp, AlertCircle, History, CreditCard, Building2, AlertTriangle, CalendarIcon, Clock, SkipForward, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  frequency: string;
  is_recurring: boolean;
  is_autopay: boolean;
  is_variable_amount?: boolean;
  status: string;
  scheduled_payment_date?: string | null;
  remaining_balance?: number | null;
  linked_debt_id?: string | null;
  linked_account_id?: string | null;
}

interface PaymentHistory {
  amount: number;
  paid_date: string;
}

interface Account {
  id: string;
  name: string;
  institution: string | null;
  account_type: string;
}

interface PayBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'check', label: 'Check', icon: Receipt },
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'autopay', label: 'Autopay', icon: CheckCircle2 },
  { value: 'other', label: 'Other', icon: Receipt },
];

const PayBillModal = ({ open, onOpenChange, bill, onSuccess }: PayBillModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [createRecurring, setCreateRecurring] = useState(true);
  const createTransaction = true; // Always create a linked transaction
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Phase 1 new fields
  const [paymentMethod, setPaymentMethod] = useState('');
  const [accountId, setAccountId] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Phase 2 - Scheduled payments
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  
  // Phase 3 - Partial payments
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  
  // Phase 4 - Skip/Defer
  const [isSkipping, setIsSkipping] = useState(false);

  // Fetch payment history and accounts when modal opens
  useEffect(() => {
    if (open && bill && user) {
      fetchPaymentHistory();
      fetchAccounts();
      // Pre-select autopay if bill has autopay enabled
      if (bill.is_autopay) {
        setPaymentMethod('autopay');
      }
    }
  }, [open, bill, user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setAmount('');
      setNotes('');
      setPaymentMethod('');
      setAccountId('');
      setConfirmationNumber('');
      setLateFeeAmount('');
      setShowAdvanced(false);
      setIsScheduling(false);
      setScheduledDate(undefined);
      setIsPartialPayment(false);
    } else if (bill) {
      // Pre-fill amount for variable bills with the last known amount
      if (bill.is_variable_amount && bill.amount > 0) {
        setAmount(bill.amount.toString());
      }
      // Pre-fill late fee from bill if set
      if ((bill as any).late_fee_amount && (bill as any).late_fee_amount > 0) {
        setLateFeeAmount((bill as any).late_fee_amount.toString());
      }
      if (bill.scheduled_payment_date) {
        setIsScheduling(true);
        setScheduledDate(new Date(bill.scheduled_payment_date));
      }
    }
  }, [open, bill]);

  // Calculate remaining balance - use stored value or calculate from amount
  const getRemainingBalance = (): number => {
    if (!bill) return 0;
    if (bill.remaining_balance !== null && bill.remaining_balance !== undefined) {
      return bill.remaining_balance;
    }
    return bill.amount;
  };

  const remainingBalance = getRemainingBalance();

  const fetchAccounts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('accounts')
      .select('id, name, institution, account_type')
      .eq('user_id', user.id)
      .in('account_type', ['checking', 'savings', 'credit_card'])
      .order('name');

    if (!error && data) {
      setAccounts(data);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user || !bill) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .select('amount, paid_date, bills!inner(name)')
        .eq('user_id', user.id)
        .order('paid_date', { ascending: false })
        .limit(6);

      if (!error && data) {
        const relevantPayments = data
          .filter((p: any) => p.bills?.name === bill.name)
          .map((p: any) => ({ amount: p.amount, paid_date: p.paid_date }));
        setPaymentHistory(relevantPayments);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getPaymentStats = () => {
    if (paymentHistory.length === 0) return null;
    
    const amounts = paymentHistory.map(p => p.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const lastPaid = paymentHistory[0];
    
    return { avg, min, max, lastPaid };
  };

  const stats = getPaymentStats();
  const isVariableBill = bill?.is_variable_amount === true;
  const isOverdue = bill ? new Date(bill.due_date) < new Date() : false;

  const handleSchedulePayment = async () => {
    if (!user || !bill || !scheduledDate) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('bills')
        .update({
          scheduled_payment_date: format(scheduledDate, 'yyyy-MM-dd'),
        })
        .eq('id', bill.id)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error scheduling payment:', error);
        toast.error('Failed to schedule payment');
      } else {
        toast.success(`Payment scheduled for ${format(scheduledDate, 'PPP')}`);
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBill = async () => {
    if (!user || !bill) return;
    
    setIsSkipping(true);
    
    try {
      // Mark current bill as skipped
      const { error: updateError } = await supabase
        .from('bills')
        .update({
          status: 'skipped',
          scheduled_payment_date: null,
        })
        .eq('id', bill.id)
        .eq('user_id', user!.id);

      if (updateError) {
        console.error('Error skipping bill:', updateError);
        toast.error('Failed to skip bill');
        setIsSkipping(false);
        return;
      }

      // If recurring, create next bill occurrence (with duplicate check)
      if (bill.is_recurring) {
        const currentDueDate = new Date(bill.due_date);
        let nextDueDate: Date;

        switch (bill.frequency) {
          case 'weekly':
            nextDueDate = addWeeks(currentDueDate, 1);
            break;
          case 'biweekly':
            nextDueDate = addWeeks(currentDueDate, 2);
            break;
          case 'monthly':
            nextDueDate = addMonths(currentDueDate, 1);
            break;
          case 'quarterly':
            nextDueDate = addMonths(currentDueDate, 3);
            break;
          case 'semi_annual':
            nextDueDate = addMonths(currentDueDate, 6);
            break;
          case 'annual':
            nextDueDate = addYears(currentDueDate, 1);
            break;
          default:
            nextDueDate = addMonths(currentDueDate, 1);
        }

        // Check if a pending bill with the same name already exists for the next period
        const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');
        const nextMonthStart = format(startOfMonth(nextDueDate), 'yyyy-MM-dd');
        const nextMonthEnd = format(endOfMonth(nextDueDate), 'yyyy-MM-dd');
        const { data: existingNext } = await supabase
          .from('bills')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', bill.name)
          .eq('status', 'pending')
          .gte('due_date', nextMonthStart)
          .lte('due_date', nextMonthEnd)
          .limit(1);

        if (!existingNext || existingNext.length === 0) {
          await supabase
            .from('bills')
            .insert({
              user_id: user.id,
              name: bill.name,
              amount: bill.amount,
              category: bill.category as any,
              due_date: nextDueDateStr,
              frequency: bill.frequency as any,
              is_recurring: bill.is_recurring,
              is_autopay: bill.is_autopay,
              is_variable_amount: bill.is_variable_amount,
              status: 'pending',
              remaining_balance: bill.amount,
            });
        }
      }

      toast.success(`${bill.name} skipped`, {
        description: bill.is_recurring ? 'Next occurrence created' : undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSkipping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bill) return;

    // Verify session is still valid before making changes
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    // If scheduling mode, handle differently
    if (isScheduling && scheduledDate) {
      await handleSchedulePayment();
      return;
    }

    if (isVariableBill && !amount.trim()) {
      toast.error('Please enter the payment amount for this variable bill');
      return;
    }

    setIsLoading(true);

    const paymentAmount = parseFloat(amount) || remainingBalance;
    const lateFee = parseFloat(lateFeeAmount) || 0;
    const paidDate = format(new Date(), 'yyyy-MM-dd');
    
    // Calculate new remaining balance after this payment
    const newRemainingBalance = Math.max(0, remainingBalance - paymentAmount);
    const isFullPayment = newRemainingBalance === 0;

    try {
      let linkedTransactionId: string | null = null;

      // Create linked transaction if enabled
      if (createTransaction) {
        const totalAmount = paymentAmount + lateFee;
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            title: `Bill Payment: ${bill.name}${lateFee > 0 ? ' (incl. late fee)' : ''}`,
            amount: totalAmount,
            type: 'expense',
            category: bill.category,
            transaction_date: paidDate,
            is_recurring: bill.is_recurring,
            linked_bill_id: bill.id,
            account_id: accountId && accountId !== 'none' ? accountId : null,
            notes: notes.trim() || `Payment for ${bill.name}`,
          })
          .select('id')
          .single();

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          toast.error('Failed to create linked transaction');
        } else {
          linkedTransactionId = transactionData.id;
        }
      }

      // Record the payment with all new fields
      const { error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: bill.id,
          user_id: user.id,
          amount: paymentAmount,
          paid_date: paidDate,
          notes: notes.trim() || null,
          linked_transaction_id: linkedTransactionId,
          payment_method: paymentMethod || null,
          account_id: accountId && accountId !== 'none' ? accountId : null,
          confirmation_number: confirmationNumber.trim() || null,
          late_fee_amount: lateFee,
        });

      if (paymentError) {
        console.error('Error recording payment:', paymentError);
        toast.error('Failed to record payment');
        setIsLoading(false);
        return;
      }

      // Sync payment to linked debt if applicable
      if (bill.linked_debt_id) {
        const { error: debtPaymentError } = await supabase
          .from('debt_payments')
          .insert({
            debt_id: bill.linked_debt_id,
            user_id: user.id,
            amount: paymentAmount,
            payment_date: paidDate,
            payment_type: 'regular',
            notes: `Auto-synced from bill payment: ${bill.name}`,
          });

        if (!debtPaymentError) {
          // Reduce the debt's current balance
          const { data: debtData } = await supabase
            .from('debts')
            .select('current_balance')
            .eq('id', bill.linked_debt_id)
            .single();

          if (debtData) {
            await supabase
              .from('debts')
              .update({ current_balance: Math.max(0, debtData.current_balance - paymentAmount) })
              .eq('id', bill.linked_debt_id);
          }
        } else {
          console.error('Error syncing debt payment:', debtPaymentError);
        }
      }

      // Update the bill status, remaining balance, and clear any scheduled date
      const { error: updateError } = await supabase
        .from('bills')
        .update({
          status: isFullPayment ? 'paid' : 'partially_paid',
          last_paid_date: paidDate,
          scheduled_payment_date: null,
          remaining_balance: newRemainingBalance,
        })
        .eq('id', bill.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating bill:', updateError);
        toast.error('Failed to update bill status');
        setIsLoading(false);
        return;
      }

      // If recurring and fully paid, create next bill (with duplicate check)
      if (bill.is_recurring && createRecurring && isFullPayment) {
        const currentDueDate = new Date(bill.due_date);
        let nextDueDate: Date;

        switch (bill.frequency) {
          case 'weekly':
            nextDueDate = addWeeks(currentDueDate, 1);
            break;
          case 'biweekly':
            nextDueDate = addWeeks(currentDueDate, 2);
            break;
          case 'monthly':
            nextDueDate = addMonths(currentDueDate, 1);
            break;
          case 'quarterly':
            nextDueDate = addMonths(currentDueDate, 3);
            break;
          case 'semi_annual':
            nextDueDate = addMonths(currentDueDate, 6);
            break;
          case 'annual':
            nextDueDate = addYears(currentDueDate, 1);
            break;
          default:
            nextDueDate = addMonths(currentDueDate, 1);
        }

        const nextBillAmount = isVariableBill ? paymentAmount : bill.amount;
        const nextDueDateStr = format(nextDueDate, 'yyyy-MM-dd');

        // Check if a pending bill with the same name already exists for the next period
        const nextMonthStart = format(startOfMonth(nextDueDate), 'yyyy-MM-dd');
        const nextMonthEnd = format(endOfMonth(nextDueDate), 'yyyy-MM-dd');
        const { data: existingNext } = await supabase
          .from('bills')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', bill.name)
          .eq('status', 'pending')
          .gte('due_date', nextMonthStart)
          .lte('due_date', nextMonthEnd)
          .limit(1);

        if (!existingNext || existingNext.length === 0) {
          await supabase
            .from('bills')
            .insert({
              user_id: user.id,
              name: bill.name,
              amount: nextBillAmount,
              category: bill.category as any,
              due_date: nextDueDateStr,
              frequency: bill.frequency as any,
              is_recurring: bill.is_recurring,
              is_autopay: bill.is_autopay,
              is_variable_amount: bill.is_variable_amount,
              status: 'pending',
              remaining_balance: nextBillAmount,
            });
        }
      }

      let successMessage: string;
      let description: string | undefined;
      
      if (!isFullPayment) {
        successMessage = `Partial payment of $${paymentAmount.toFixed(2)} recorded`;
        description = `$${newRemainingBalance.toFixed(2)} remaining`;
      } else if (lateFee > 0) {
        successMessage = `Payment of $${paymentAmount.toFixed(2)} + $${lateFee.toFixed(2)} late fee recorded!`;
        description = createTransaction ? 'Transaction created and linked to bill.' : undefined;
      } else {
        successMessage = 'Payment recorded successfully!';
        description = createTransaction ? 'Transaction created and linked to bill.' : undefined;
      }
      
      toast.success(successMessage, { description });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Pay Bill
          </DialogTitle>
          {isVariableBill && (
            <DialogDescription className="text-amber-600 dark:text-amber-400">
              <div className="flex items-start gap-2 mt-1 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">⚡ Variable Bill — Confirm This Month's Amount</p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                    This bill changes monthly. Check your latest statement and update the amount below before paying.
                    {stats?.lastPaid && (
                      <span className="block mt-1">Last paid: <strong>${stats.lastPaid.amount.toFixed(2)}</strong> on {format(new Date(stats.lastPaid.paid_date), 'MMM d')}</span>
                    )}
                  </p>
                </div>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">{bill.name}</h3>
            <div className="flex gap-1.5">
              {isVariableBill && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                  Variable
                </Badge>
              )}
              {bill.status === 'partially_paid' && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30">
                  Partial
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
          <p className="text-muted-foreground">Due: {format(new Date(bill.due_date), 'PPP')}</p>

          {/* Pay at merchant site button */}
          {(bill as any).payment_url && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full gap-2 text-primary border-primary/30 hover:bg-primary/5"
              onClick={() => window.open((bill as any).payment_url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
              Visit Website
            </Button>
          )}
          
          {/* Show remaining balance if partially paid or different from amount */}
          {(bill.status === 'partially_paid' || (remainingBalance > 0 && remainingBalance < bill.amount)) && (
            <div className="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">Original Amount:</span>
                <span className="text-muted-foreground">${bill.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-blue-700 dark:text-blue-300">Remaining Balance:</span>
                <span className="text-blue-600 dark:text-blue-400">${remainingBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment History for Variable Bills */}
        {isVariableBill && stats && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <History className="h-4 w-4 text-muted-foreground" />
              Payment History
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 rounded bg-background">
                <div className="text-muted-foreground text-xs">Last</div>
                <div className="font-semibold">${stats.lastPaid.amount.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded bg-background">
                <div className="text-muted-foreground text-xs">Average</div>
                <div className="font-semibold">${stats.avg.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded bg-background">
                <div className="text-muted-foreground text-xs">Range</div>
                <div className="font-semibold text-xs">${stats.min.toFixed(0)} - ${stats.max.toFixed(0)}</div>
              </div>
            </div>
            {paymentHistory.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {paymentHistory.slice(0, 4).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAmount(p.amount.toString())}
                    className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    ${p.amount.toFixed(2)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Schedule vs Pay Now Toggle */}
          <div className="flex gap-2 p-1 rounded-lg bg-muted">
            <Button
              type="button"
              variant={!isScheduling ? "default" : "ghost"}
              size="sm"
              className={cn("flex-1", !isScheduling && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => setIsScheduling(false)}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Pay Now
            </Button>
            <Button
              type="button"
              variant={isScheduling ? "default" : "ghost"}
              size="sm"
              className={cn("flex-1", isScheduling && "bg-blue-600 hover:bg-blue-700")}
              onClick={() => setIsScheduling(true)}
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Schedule
            </Button>
          </div>

          {/* Scheduled Date Picker */}
          {isScheduling && (
            <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <Label className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <CalendarIcon className="h-4 w-4" />
                Schedule Payment For
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                A reminder will help you remember to pay on this date
              </p>
            </div>
          )}

          {/* Payment Amount - Only show if not scheduling */}
          {!isScheduling && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount" className="flex items-center gap-2">
                  Payment Amount
                  {isVariableBill && <span className="text-destructive">*</span>}
                </Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="partialPayment" className="text-xs text-muted-foreground cursor-pointer">
                    Partial payment
                  </Label>
                  <Switch
                    id="partialPayment"
                    checked={isPartialPayment}
                    onCheckedChange={setIsPartialPayment}
                  />
                </div>
              </div>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={isVariableBill ? "Enter actual amount" : remainingBalance.toFixed(2)}
                className={cn(
                  isVariableBill && !amount && "border-amber-300 focus:border-amber-500",
                  isPartialPayment && "border-blue-300 focus:border-blue-500"
                )}
                autoFocus={isVariableBill || isPartialPayment}
              />
              {!isVariableBill && !isPartialPayment && (
                <p className="text-xs text-muted-foreground">
                  Leave blank to pay full amount: ${remainingBalance.toFixed(2)}
                </p>
              )}
              {isPartialPayment && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Enter partial amount. Remaining: ${remainingBalance.toFixed(2)}
                </p>
              )}
              {isVariableBill && stats && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Based on history, expect ${stats.avg.toFixed(2)} (avg)
                </p>
              )}
              {/* Quick amount buttons for partial payments */}
              {isPartialPayment && remainingBalance > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {[0.25, 0.5, 0.75].map((fraction) => {
                    const partialAmount = (remainingBalance * fraction).toFixed(2);
                    return (
                      <button
                        key={fraction}
                        type="button"
                        onClick={() => setAmount(partialAmount)}
                        className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {fraction * 100}% (${partialAmount})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment details - only show when not scheduling */}
          {!isScheduling && (
            <>
              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Account Selection */}
              {accounts.length > 0 && (
                <div className="space-y-2">
                  <Label>Paid From Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No account linked</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {account.name}
                            {account.institution && (
                              <span className="text-muted-foreground text-xs">
                                ({account.institution})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Confirmation Number */}
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmation Number</Label>
                <Input
                  id="confirmation"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  placeholder="e.g., REF-12345678"
                />
              </div>

              {/* Late Fee - Show prominently if overdue */}
              {isOverdue && (
                <div className="space-y-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <Label htmlFor="lateFee" className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Late Fee (if applicable)
                  </Label>
                  <Input
                    id="lateFee"
                    type="number"
                    step="0.01"
                    value={lateFeeAmount}
                    onChange={(e) => setLateFeeAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Advanced Options Collapsible */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                    {showAdvanced ? 'Hide' : 'Show'} additional options
                    <span className="text-xs">{showAdvanced ? '▲' : '▼'}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional payment notes..."
                      rows={2}
                    />
                  </div>

                  {/* Late Fee - Also show here if not overdue */}
                  {!isOverdue && (
                    <div className="space-y-2">
                      <Label htmlFor="lateFeeHidden">Late Fee</Label>
                      <Input
                        id="lateFeeHidden"
                        type="number"
                        step="0.01"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Transaction info note - only show when not scheduling */}
          {!isScheduling && (
            <>
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4 shrink-0" />
                <span>A transaction will be automatically created for this payment</span>
              </div>

              {bill.is_recurring && (
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="recurring">Create next recurring bill</Label>
                  <Switch
                    id="recurring"
                    checked={createRecurring}
                    onCheckedChange={setCreateRecurring}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            
            {/* Skip button - only for recurring bills and not when scheduling */}
            {bill.is_recurring && !isScheduling && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSkipBill}
                disabled={isLoading || isSkipping}
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <SkipForward className="h-4 w-4 mr-1" />
                {isSkipping ? 'Skipping...' : 'Skip'}
              </Button>
            )}
            
            {isScheduling ? (
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700" 
                disabled={isLoading || !scheduledDate}
              >
                <Clock className="h-4 w-4 mr-2" />
                {isLoading ? 'Scheduling...' : 'Schedule Payment'}
              </Button>
            ) : (
              <Button 
                type="submit" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                disabled={isLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isLoading ? 'Recording...' : 'Mark as Paid'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayBillModal;
