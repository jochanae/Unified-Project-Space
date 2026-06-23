import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMonths, addDays, addWeeks, isBefore, startOfMonth } from "date-fns";
import { CalendarIcon, Clock, Calculator, FileText, Bell, AlertTriangle, ExternalLink, Link2, Info, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePushNotifications } from "@/hooks/usePushNotifications";

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
  reminder_enabled: boolean;
  reminder_days_before?: number;
  status: string;
  notes: string | null;
  scheduled_payment_date?: string | null;
  autopay_source?: 'internal' | 'external' | null;
  end_date?: string | null;
  total_payments?: number | null;
}

interface CreateBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Bill | null;
  onSuccess: () => void;
}

const categories = [
  { value: 'mortgage', label: '🏠 Mortgage', taxRelevant: true },
  { value: 'rent', label: '🏢 Rent', taxRelevant: false },
  { value: 'property_tax', label: '🏛️ Property Tax', taxRelevant: true },
  { value: 'utilities', label: '💡 Utilities', taxRelevant: false },
  { value: 'insurance', label: '🛡️ Insurance', taxRelevant: false },
  { value: 'student_loan', label: '🎓 Student Loan', taxRelevant: true },
  { value: 'loans', label: '💳 Loans', taxRelevant: false },
  { value: 'credit_card', label: '💳 Credit Card', taxRelevant: false },
  { value: 'medical', label: '🏥 Medical', taxRelevant: true },
  { value: 'subscriptions', label: '📱 Subscriptions', taxRelevant: false },
  { value: 'phone', label: '📞 Phone', taxRelevant: false },
  { value: 'internet', label: '🌐 Internet', taxRelevant: false },
  { value: 'streaming', label: '📺 Streaming', taxRelevant: false },
  { value: 'gym', label: '🏋️ Gym', taxRelevant: false },
  { value: 'transportation', label: '🚗 Transportation', taxRelevant: false },
  { value: 'other', label: '📁 Other', taxRelevant: false },
];

const frequencies = [
  { value: 'one_time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const CreateBillModal = ({ open, onOpenChange, bill, onSuccess }: CreateBillModalProps) => {
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [frequency, setFrequency] = useState('monthly');
  const [isRecurring, setIsRecurring] = useState(true);
  const [isAutopay, setIsAutopay] = useState(false);
  const [autopaySource, setAutopaySource] = useState<'internal' | 'external' | ''>('');
  const [autopayAccountLastFour, setAutopayAccountLastFour] = useState('');
  const [isVariableAmount, setIsVariableAmount] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [scheduledPaymentDate, setScheduledPaymentDate] = useState<Date | undefined>(undefined);
  const [lateFeeAmount, setLateFeeAmount] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [totalPayments, setTotalPayments] = useState('');
  const [beginDate, setBeginDate] = useState<Date | undefined>(undefined);
  const [linkedDebtId, setLinkedDebtId] = useState<string>('none');
  const [availableDebts, setAvailableDebts] = useState<{ id: string; name: string; debt_type: string; current_balance: number }[]>([]);
  const [autoSuggested, setAutoSuggested] = useState(false);

  // Tax tracking fields
  const [trackForTaxes, setTrackForTaxes] = useState(false);
  const [showPitiBreakdown, setShowPitiBreakdown] = useState(false);
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [propertyTaxAmount, setPropertyTaxAmount] = useState('');
  const [insuranceAmount, setInsuranceAmount] = useState('');
  const [studentLoanInterest, setStudentLoanInterest] = useState('');
  const [medicalDeductible, setMedicalDeductible] = useState('');

  const selectedCategory = categories.find(c => c.value === category);
  const isMortgage = category === 'mortgage';
  const isStudentLoan = category === 'student_loan';
  const isPropertyTax = category === 'property_tax';
  const isMedical = category === 'medical';
  const isTaxRelevantCategory = selectedCategory?.taxRelevant || false;

  // Fetch available debts for linking
  useEffect(() => {
    if (!open || !user) return;
    const fetchDebts = async () => {
      const { data } = await supabase
        .from('debts')
        .select('id, name, debt_type, current_balance')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');
      setAvailableDebts(data || []);
    };
    fetchDebts();
  }, [open, user]);

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setAmount(bill.amount.toString());
      setCategory(bill.category);
      setDueDate(new Date(bill.due_date));
      setFrequency(bill.frequency);
      setIsRecurring(bill.is_recurring);
      setIsAutopay(bill.is_autopay);
      setAutopaySource(bill.autopay_source || '');
      setAutopayAccountLastFour((bill as any).autopay_account_last_four || '');
      setIsVariableAmount(bill.is_variable_amount || false);
      setReminderEnabled(bill.reminder_enabled);
      setNotes(bill.notes || '');
      setPaymentUrl((bill as any).payment_url || '');
      setScheduledPaymentDate(bill.scheduled_payment_date ? new Date(bill.scheduled_payment_date) : undefined);
      setLateFeeAmount((bill as any).late_fee_amount ? (bill as any).late_fee_amount.toString() : '');
      setEndDate(bill.end_date ? new Date(bill.end_date + 'T00:00:00') : undefined);
      setTotalPayments(bill.total_payments ? bill.total_payments.toString() : '');
      setLinkedDebtId((bill as any).linked_debt_id || 'none');
      setAutoSuggested(false);
      
      // Load tax details if they exist
      loadTaxDetails(bill.id);
    } else {
      resetForm();
    }
  }, [bill, open]);

  // Auto-suggest debt match when name changes (only for new bills)
  useEffect(() => {
    if (bill || !name.trim() || availableDebts.length === 0) return;
    const normalizedName = name.trim().toLowerCase();
    const match = availableDebts.find(d => {
      const dName = d.name.toLowerCase();
      return dName.includes(normalizedName) || normalizedName.includes(dName) ||
        dName.split(/[\s\-()]+/).some(w => w.length > 3 && normalizedName.includes(w));
    });
    if (match && linkedDebtId === 'none') {
      setLinkedDebtId(match.id);
      setAutoSuggested(true);
    }
  }, [name, availableDebts, bill]);

  const loadTaxDetails = async (billId: string) => {
    const { data } = await supabase
      .from('bill_tax_details')
      .select('*')
      .eq('bill_id', billId)
      .single();
    
    if (data) {
      setTrackForTaxes(data.is_tax_deductible);
      setPrincipalAmount(data.principal_amount?.toString() || '');
      setInterestAmount(data.interest_amount?.toString() || '');
      setPropertyTaxAmount(data.property_tax_amount?.toString() || '');
      setInsuranceAmount(data.insurance_amount?.toString() || '');
      setStudentLoanInterest(data.student_loan_interest?.toString() || '');
      setShowPitiBreakdown(data.principal_amount > 0 || data.interest_amount > 0);
    }
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategory('other');
    setDueDate(new Date());
    setFrequency('monthly');
    setIsRecurring(true);
    setIsAutopay(false);
    setAutopaySource('');
    setAutopayAccountLastFour('');
    setIsVariableAmount(false);
    setReminderEnabled(true);
      setNotes('');
      setPaymentUrl('');
      setScheduledPaymentDate(undefined);
      setLateFeeAmount('');
    setEndDate(undefined);
    setTotalPayments('');
    setBeginDate(undefined);
    setShowPushPrompt(false);
    // Reset tax fields
    setTrackForTaxes(false);
    setShowPitiBreakdown(false);
    setPrincipalAmount('');
    setInterestAmount('');
    setPropertyTaxAmount('');
    setInsuranceAmount('');
    setStudentLoanInterest('');
    setMedicalDeductible('');
    setLinkedDebtId('none');
    setAutoSuggested(false);
  };

  // Auto-calculate when PITI fields change
  useEffect(() => {
    if (showPitiBreakdown && isMortgage) {
      const total = 
        (parseFloat(principalAmount) || 0) +
        (parseFloat(interestAmount) || 0) +
        (parseFloat(propertyTaxAmount) || 0) +
        (parseFloat(insuranceAmount) || 0);
      if (total > 0) {
        setAmount(total.toFixed(2));
      }
    }
  }, [principalAmount, interestAmount, propertyTaxAmount, insuranceAmount, showPitiBreakdown, isMortgage]);

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast.error('Please enter a bill name');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);

    const billData = {
      user_id: user.id,
      name: name.trim(),
      amount: parseFloat(amount),
      category: category as any,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      frequency: frequency as any,
      is_recurring: isRecurring,
      is_autopay: isAutopay,
      autopay_source: isAutopay && autopaySource ? autopaySource : null,
      autopay_account_last_four: isAutopay && autopaySource === 'external' && autopayAccountLastFour ? autopayAccountLastFour : null,
      is_variable_amount: isVariableAmount,
      reminder_enabled: reminderEnabled,
      notes: notes.trim() || null,
      payment_url: paymentUrl.trim() || null,
      scheduled_payment_date: scheduledPaymentDate ? format(scheduledPaymentDate, 'yyyy-MM-dd') : null,
      late_fee_amount: parseFloat(lateFeeAmount) || 0,
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      total_payments: totalPayments ? parseInt(totalPayments) : null,
      linked_debt_id: linkedDebtId !== 'none' ? linkedDebtId : null,
    };

    let billId = bill?.id;

    if (bill) {
      const { error } = await supabase
        .from('bills')
        .update(billData)
        .eq('id', bill.id);

      if (error) {
        console.error('Error updating bill:', error);
        toast.error('Failed to update bill');
        setIsLoading(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('bills')
        .insert(billData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating bill:', error);
        toast.error('Failed to create bill');
        setIsLoading(false);
        return;
      }
      billId = data.id;

      // Generate historical payments if begin date is set
      if (beginDate && billId && isRecurring) {
        try {
          const billAmount = parseFloat(amount);
          const historicalPayments: {
            bill_id: string;
            user_id: string;
            amount: number;
            paid_date: string;
            payment_method: string;
          }[] = [];

          // Generate payment dates from begin date up to (but not including) the due date month
          let paymentDate = new Date(beginDate);
          const dueDateMonth = startOfMonth(dueDate);

          while (isBefore(paymentDate, dueDateMonth)) {
            const paidDateStr = format(paymentDate, 'yyyy-MM-dd');
            historicalPayments.push({
              bill_id: billId,
              user_id: user.id,
              amount: billAmount,
              paid_date: paidDateStr,
              payment_method: 'historical',
            });

            // Advance by frequency
            const freq = frequency || 'monthly';
            switch (freq) {
              case 'weekly': paymentDate = addDays(paymentDate, 7); break;
              case 'biweekly': paymentDate = addDays(paymentDate, 14); break;
              case 'quarterly': paymentDate = addMonths(paymentDate, 3); break;
              case 'semi_annual': paymentDate = addMonths(paymentDate, 6); break;
              case 'annual': paymentDate = addMonths(paymentDate, 12); break;
              default: paymentDate = addMonths(paymentDate, 1);
            }
          }

          if (historicalPayments.length > 0) {
            const { error: histError } = await supabase
              .from('bill_payments')
              .insert(historicalPayments);

            if (histError) {
              console.error('Error creating historical payments:', histError);
              toast.warning(`Bill created, but historical payments could not be saved`);
            } else {
              toast.success(`Created ${historicalPayments.length} historical payment${historicalPayments.length > 1 ? 's' : ''}`);
            }
          }
        } catch (histErr) {
          console.error('Error generating historical payments:', histErr);
        }
      }
    }

    // Save tax details if tracking for taxes
    if (trackForTaxes && billId) {
      const taxData = {
        bill_id: billId,
        user_id: user.id,
        is_tax_deductible: true,
        principal_amount: parseFloat(principalAmount) || 0,
        interest_amount: parseFloat(interestAmount) || 0,
        property_tax_amount: parseFloat(propertyTaxAmount) || 0,
        insurance_amount: parseFloat(insuranceAmount) || 0,
        student_loan_interest: parseFloat(studentLoanInterest) || 0,
        deductible_amount: calculateDeductibleAmount(),
        deduction_category: getDeductionCategory(),
        tax_year: new Date().getFullYear(),
      };

      const { error: taxError } = await supabase
        .from('bill_tax_details')
        .upsert(taxData, { onConflict: 'bill_id,tax_year' });

      if (taxError) {
        console.error('Error saving tax details:', taxError);
        // Don't fail the whole operation, just warn
        toast.warning('Bill saved, but tax details could not be saved');
      }
    }

    toast.success(bill ? 'Bill updated successfully' : 'Bill created successfully');
    onSuccess();
    
    if (addAnother) {
      resetForm();
    } else {
      onOpenChange(false);
    }

    setIsLoading(false);
  };

  const calculateDeductibleAmount = () => {
    if (isMortgage) {
      return (parseFloat(interestAmount) || 0) + (parseFloat(propertyTaxAmount) || 0);
    }
    if (isStudentLoan) {
      return parseFloat(studentLoanInterest) || 0;
    }
    if (isPropertyTax) {
      return parseFloat(amount) || 0;
    }
    if (isMedical) {
      return parseFloat(medicalDeductible) || parseFloat(amount) || 0;
    }
    return 0;
  };

  const getDeductionCategory = () => {
    if (isMortgage) return 'mortgage_interest';
    if (isStudentLoan) return 'student_loan_interest';
    if (isPropertyTax) return 'property_tax';
    if (isMedical) return 'medical_expenses';
    return 'other';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {bill ? 'Edit Bill' : 'Add Bill'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bill Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Home Mortgage"
            />
          </div>

          <div className="space-y-2">
            <Label>Category <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <span className="flex items-center gap-2">
                      {cat.label}
                      {cat.taxRelevant && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                          Tax
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Link to Debt */}
          {availableDebts.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Link to Debt
              </Label>
              <Select value={linkedDebtId} onValueChange={(v) => { setLinkedDebtId(v); setAutoSuggested(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="None (standalone bill)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (standalone bill)</SelectItem>
                  {availableDebts.map((debt) => (
                    <SelectItem key={debt.id} value={debt.id}>
                      {debt.name} (${debt.current_balance.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {autoSuggested && linkedDebtId !== 'none' && (
                <p className="text-xs text-muted-foreground">
                  ✨ Auto-matched to a similar debt. Payments will sync to this debt automatically.
                </p>
              )}
              {linkedDebtId !== 'none' && !autoSuggested && (
                <p className="text-xs text-muted-foreground">
                  Payments for this bill will automatically reduce the linked debt balance.
                </p>
              )}
            </div>
          )}

          {/* Tax-Deductible Notice */}
          {isTaxRelevantCategory && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <FileText className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    This may be tax-deductible!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    {isMortgage && "Track your PITI breakdown to capture mortgage interest and property tax deductions."}
                    {isStudentLoan && "Student loan interest may be tax-deductible up to $2,500/year."}
                    {isPropertyTax && "Property taxes are deductible up to $10,000/year (SALT limit)."}
                    {isMedical && "Medical expenses exceeding 7.5% of AGI may be deductible."}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      id="trackTaxes"
                      checked={trackForTaxes}
                      onCheckedChange={setTrackForTaxes}
                    />
                    <Label htmlFor="trackTaxes" className="text-sm text-green-800 dark:text-green-300 cursor-pointer">
                      Track for Tax Optimization
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PITI Breakdown for Mortgages */}
          {isMortgage && trackForTaxes && (
            <Collapsible open={showPitiBreakdown} onOpenChange={setShowPitiBreakdown}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    PITI Breakdown (Principal, Interest, Taxes, Insurance)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {showPitiBreakdown ? 'Hide' : 'Show'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3 p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground">
                  Enter your monthly payment breakdown. Interest and Property Tax will be tracked for tax deductions.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Principal</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">Interest ✓</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={interestAmount}
                      onChange={(e) => setInterestAmount(e.target.value)}
                      placeholder="0.00"
                      className="border-green-300 dark:border-green-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">Property Tax ✓</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={propertyTaxAmount}
                      onChange={(e) => setPropertyTaxAmount(e.target.value)}
                      placeholder="0.00"
                      className="border-green-300 dark:border-green-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Insurance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={insuranceAmount}
                      onChange={(e) => setInsuranceAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {(parseFloat(interestAmount) > 0 || parseFloat(propertyTaxAmount) > 0) && (
                  <p className="text-xs text-green-600 font-medium">
                    📊 Tax-deductible: ${((parseFloat(interestAmount) || 0) + (parseFloat(propertyTaxAmount) || 0)).toFixed(2)}/month 
                    (${(((parseFloat(interestAmount) || 0) + (parseFloat(propertyTaxAmount) || 0)) * 12).toFixed(2)}/year)
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Student Loan Interest */}
          {isStudentLoan && trackForTaxes && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <Label className="text-sm">Monthly Interest Portion</Label>
              <Input
                type="number"
                step="0.01"
                value={studentLoanInterest}
                onChange={(e) => setStudentLoanInterest(e.target.value)}
                placeholder="Estimated interest amount"
              />
              <p className="text-xs text-muted-foreground">
                If you don't know the exact split, estimate ~70% of payment as interest for newer loans.
              </p>
            </div>
          )}

          {/* Medical Deductible Amount */}
          {isMedical && trackForTaxes && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <Label className="text-sm">Deductible Portion</Label>
              <Input
                type="number"
                step="0.01"
                value={medicalDeductible}
                onChange={(e) => setMedicalDeductible(e.target.value)}
                placeholder="Amount eligible for deduction"
              />
              <p className="text-xs text-muted-foreground">
                Only medical expenses exceeding 7.5% of your AGI are deductible.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={showPitiBreakdown && isMortgage}
            />
            {showPitiBreakdown && isMortgage && (
              <p className="text-xs text-muted-foreground">Auto-calculated from PITI breakdown</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Due Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => date && setDueDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Begin Date - for historical data backfill (only on new bills) */}
          {!bill && isRecurring && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <History className="h-4 w-4 text-primary" />
                Begin Date (Optional)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="p-0">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      <p>Set when you started paying this bill. Historical payments will be created at the current amount.</p>
                      <p className="mt-1 text-muted-foreground">For variable bills, each month will use the same amount — you can edit individual months later.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !beginDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {beginDate ? format(beginDate, "PPP") : "When did you start paying this?"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={beginDate}
                    onSelect={setBeginDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {beginDate && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setBeginDate(undefined)}
                  >
                    Clear begin date
                  </Button>
                  {isVariableAmount && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ Variable bill: historical months will use ${amount || '0'} — edit individual months later for actual amounts.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurring">Recurring Bill</Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* End Date / Total Payments for time-limited recurring bills */}
          {isRecurring && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground">
                Optional: Set an end date or total number of payments for time-limited bills (e.g., 12-month escrow shortage)
              </p>
              <div className="space-y-2">
                <Label className="text-sm">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "No end date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {endDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setEndDate(undefined)}
                  >
                    Clear end date
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Or Total Payments</Label>
                <Input
                  type="number"
                  min="1"
                  value={totalPayments}
                  onChange={(e) => setTotalPayments(e.target.value)}
                  placeholder="e.g., 12"
                />
                <p className="text-xs text-muted-foreground">
                  The bill will stop recurring after this many payments.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="autopay">Autopay Enabled</Label>
            <Switch
              id="autopay"
              checked={isAutopay}
              onCheckedChange={(checked) => {
                setIsAutopay(checked);
                if (!checked) setAutopaySource('');
              }}
            />
          </div>

          {isAutopay && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
              <Label className="text-sm">Who handles autopay?</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAutopaySource('internal')}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    autopaySource === 'internal' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted"
                  )}
                >
                  <p className="text-sm font-medium">⚡ CoinsBloom</p>
                  <p className="text-xs text-muted-foreground mt-1">Paid through this app</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAutopaySource('external')}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-colors",
                    autopaySource === 'external' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted"
                  )}
                >
                  <p className="text-sm font-medium">🏦 My Bank</p>
                  <p className="text-xs text-muted-foreground mt-1">Paid externally</p>
                </button>
              </div>
              {autopaySource === 'external' && (
                <div className="mt-2">
                  <Label htmlFor="autopayLastFour" className="text-xs text-muted-foreground">Last 4 digits of account (optional)</Label>
                  <input
                    id="autopayLastFour"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="e.g. 4321"
                    value={autopayAccountLastFour}
                    onChange={(e) => setAutopayAccountLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="mt-1 w-24 h-8 px-2 text-sm rounded-md border border-border bg-background"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="variable">Variable Amount</Label>
              <p className="text-xs text-muted-foreground">Amount changes each billing cycle (e.g., utilities)</p>
            </div>
            <Switch
              id="variable"
              checked={isVariableAmount}
              onCheckedChange={setIsVariableAmount}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="reminder">Reminder</Label>
            <Switch
              id="reminder"
              checked={reminderEnabled}
              onCheckedChange={(checked) => {
                setReminderEnabled(checked);
                // Show push notification prompt if enabling reminder and push not enabled
                if (checked && isSupported && !isSubscribed && permission !== 'denied') {
                  setShowPushPrompt(true);
                }
              }}
            />
          </div>

          {/* Push Notification Prompt - shown when enabling reminders without push */}
          {showPushPrompt && reminderEnabled && !isSubscribed && (
            <Alert className="border-primary/50 bg-primary/5">
              <Bell className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span className="text-sm">
                  Enable push notifications to get bill reminders on your device?
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const success = await subscribe();
                      if (success) {
                        setShowPushPrompt(false);
                      }
                    }}
                  >
                    Enable Notifications
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPushPrompt(false)}
                  >
                    Not Now
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Late Fee Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Late Fee (if applicable)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={lateFeeAmount}
              onChange={(e) => setLateFeeAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Set the expected late fee so it auto-fills when paying overdue bills.</p>
          </div>

          {/* Scheduled Payment Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Scheduled Payment Date
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Set a date when you plan to pay this bill — useful for autopay or planning ahead. This is different from the due date.
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledPaymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledPaymentDate ? format(scheduledPaymentDate, "PPP") : "No scheduled date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledPaymentDate}
                  onSelect={setScheduledPaymentDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {scheduledPaymentDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => setScheduledPaymentDate(undefined)}
              >
                Clear scheduled date
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_url" className="flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4" />
              Website
            </Label>
            <Input
              id="payment_url"
              type="url"
              placeholder="https://www.provider.com/pay"
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Link to where you pay this bill online</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Saving...' : bill ? 'Update Bill' : 'Add Bill'}
              </Button>
            </div>
            {!bill && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isLoading}
                onClick={(e) => handleSubmit(e, true)}
              >
                Save & Add Another
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBillModal;