import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Minus, 
  DollarSign, 
  FileText, 
  Building2, 
  Calendar, 
  CreditCard, 
  Zap, 
  Repeat, 
  Shield, 
  StickyNote,
  X,
  ExternalLink,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOfflineSyncContext } from "@/contexts/OfflineSyncContext";
import { toast } from "sonner";
import { ReceiptUploadSection } from "./ReceiptUploadSection";
import { RecurrencePatternSelect, RecurrencePattern, calculateNextDate } from "./RecurrencePatternSelect";
import { useBudgetAutoUpdate } from "@/hooks/useBudgetAutoUpdate";
import { PayrollBreakdown, PayrollData } from "./PayrollBreakdown";

interface Account {
  id: string;
  name: string;
  institution: string | null;
}

interface BloomBurst {
  id: string;
  name: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "income" | "expense";
}

const incomeCategories = [
  "Salary",
  "Freelance",
  "Investment",
  "Rental",
  "Gift",
  "Private Equity Returns",
  "Hedge Fund Returns",
  "Business Sale Proceeds",
  "Capital Gains",
  "Trust Distribution",
  "Royalties & Licensing",
  "Bonus",
  "Refund",
  "Support/Alimony",
  "Other"
];

const expenseCategories = [
  "Food & Groceries",
  "Housing/Rent",
  "Insurance",
  "Credit Cards",
  "Healthcare",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Education",
  "Subscriptions",
  "Travel",
  "Personal Care",
  "Debt Payments",
  "Business",
  "Other"
];

export const AddTransactionModal = ({ 
  open, 
  onOpenChange, 
  defaultType = "income" 
}: AddTransactionModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { queueTransaction } = useOfflineSyncContext();
  const { updateBudgetFromTransaction } = useBudgetAutoUpdate();
  // Form state
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [incomeSource, setIncomeSource] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountId, setAccountId] = useState<string>("");
  const [bloomBurstId, setBloomBurstId] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("monthly");
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previousSources, setPreviousSources] = useState<string[]>([]);
  const [payrollEnabled, setPayrollEnabled] = useState(false);
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bloomBursts, setBloomBursts] = useState<BloomBurst[]>([]);

  // Reset type when defaultType changes
  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);

  // Fetch accounts and bloom bursts
  useEffect(() => {
    if (open && user) {
      // Fetch accounts
      supabase
        .from("accounts")
        .select("id, name, institution")
        .eq("user_id", user.id)
        .order("name")
        .then(({ data }) => {
          if (data) setAccounts(data);
        });

      // Fetch active bloom bursts
      supabase
        .from("bloom_bursts")
        .select("id, name, category, limit_amount, spent_amount")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("name")
        .then(({ data }) => {
          if (data) setBloomBursts(data);
        });
    }
  }, [open, user]);

  // Fetch previously used income sources for smart suggestions
  useEffect(() => {
    if (open && user && type === "income") {
      supabase
        .from("transactions")
        .select("income_source")
        .eq("user_id", user.id)
        .eq("type", "income")
        .not("income_source", "is", null)
        .then(({ data }) => {
          if (data) {
            const unique = [...new Set(data.map(d => d.income_source).filter(Boolean))] as string[];
            setPreviousSources(unique.sort());
          }
        });
    }
  }, [open, user, type]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setMerchant("");
    setCategory("");
    setIncomeSource("");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setAccountId("");
    setBloomBurstId("");
    setIsRecurring(false);
    setRecurrencePattern("monthly");
    setIsTaxDeductible(false);
    setNotes("");
    setReceiptUrl(null);
    setPayrollEnabled(false);
    setPayrollData(null);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    setLoading(true);
    
    // Build the transaction data object
    const nextRecurrenceDate = isRecurring 
      ? calculateNextDate(transactionDate, recurrencePattern) 
      : null;
    
    const transactionData = {
      user_id: user.id,
      amount: parseFloat(amount),
      title: description,
      type,
      category: category || "other",
      transaction_date: transactionDate,
      merchant: merchant || null,
      account_id: accountId || null,
      bloom_burst_id: type === "expense" ? (bloomBurstId || null) : null,
      is_recurring: isRecurring,
      recurrence_pattern: isRecurring ? recurrencePattern : null,
      next_recurrence_date: nextRecurrenceDate,
      is_tax_deductible: type === "expense" ? isTaxDeductible : false,
      notes: notes || null,
      linked_bill_id: null as string | null,
      receipt_url: receiptUrl,
      income_source: type === "income" ? (incomeSource || null) : null,
    };

    // Check if we're offline - queue for later sync
    if (!navigator.onLine) {
      try {
        await queueTransaction(transactionData);
        onOpenChange(false);
        resetForm();
      } catch (error) {
        console.error("Error queuing transaction:", error);
        toast.error("Failed to save transaction offline");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Online - proceed with normal submission
    try {
      let linkedBillId: string | null = null;

      // If recurring EXPENSE, create the bill first so we can link it
      if (isRecurring && type === "expense") {
        const { data: billData, error: billError } = await supabase
          .from("bills")
          .insert({
            user_id: user.id,
            name: description,
            amount: parseFloat(amount),
            due_date: transactionDate,
            category: "other" as const,
            is_recurring: true,
          })
          .select('id')
          .single();

        if (!billError && billData) {
          linkedBillId = billData.id;
          transactionData.linked_bill_id = linkedBillId;
        }
      }

      const { data: txData, error: txError } = await supabase.from("transactions").insert(transactionData).select('id').single();

      if (txError) throw txError;

      // Save payroll details if enabled
      if (payrollEnabled && payrollData && txData && type === "income") {
        await supabase.from("payroll_details").insert({
          transaction_id: txData.id,
          user_id: user.id,
          gross_pay: payrollData.gross_pay,
          federal_tax: payrollData.federal_tax,
          state_tax: payrollData.state_tax,
          local_tax: payrollData.local_tax,
          social_security: payrollData.social_security,
          medicare: payrollData.medicare,
          retirement_401k: payrollData.retirement_401k,
          health_insurance: payrollData.health_insurance,
          dental_insurance: payrollData.dental_insurance,
          vision_insurance: payrollData.vision_insurance,
          hsa: payrollData.hsa,
          fsa: payrollData.fsa,
          life_insurance: payrollData.life_insurance,
          disability_insurance: payrollData.disability_insurance,
          union_dues: payrollData.union_dues,
          other_deductions: payrollData.other_deductions,
          other_deductions_label: payrollData.other_deductions_label || null,
          net_pay: payrollData.net_pay,
          pay_period: payrollData.pay_period || null,
          employer_name: payrollData.employer_name || null,
        });
      }

      // If linked to a bloom burst, update the spent amount
      if (type === "expense" && bloomBurstId) {
        const burst = bloomBursts.find(b => b.id === bloomBurstId);
        if (burst) {
          await supabase
            .from("bloom_bursts")
            .update({ spent_amount: burst.spent_amount + parseFloat(amount) })
            .eq("id", bloomBurstId);
        }
      }

      // Auto-update budget envelope based on category
      if (type === "expense") {
        await updateBudgetFromTransaction({
          amount: parseFloat(amount),
          category: category,
          type: type,
          title: description,
        });
      }

      toast.success(`${type === "income" ? "Income" : "Expense"} added successfully!`);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const isIncome = type === "income";

  return (
    <ResponsiveModal open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }} title="Add Transaction" desktopMaxWidth="max-w-xl">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          {/* Drag handle */}
          <div className="mx-auto w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-4" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                key={type}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`p-2.5 rounded-full ${isIncome ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-red-100 dark:bg-red-500/20"}`}
              >
                {isIncome ? (
                  <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Minus className="h-5 w-5 text-red-500 dark:text-red-400" />
                )}
              </motion.div>
              <div>
                <h2 className="text-lg font-semibold">Add Transaction</h2>
                <p className="text-xs text-muted-foreground">Track your income or spending</p>
              </div>
            </div>
            
            {/* Income/Expense Toggle */}
            <div className="flex rounded-xl overflow-hidden border">
              <button
                onClick={() => setType("income")}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  isIncome 
                    ? "bg-emerald-500 text-white" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setType("expense")}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  !isIncome 
                    ? "bg-red-500 text-white" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Expense
              </button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Breadcrumb to full page */}
          <button
            onClick={() => {
              onOpenChange(false);
              navigate("/transactions");
            }}
            className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
          >
            <ExternalLink className="h-3 w-3" />
            View all transactions
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <div className="space-y-4 py-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                <DollarSign className="h-4 w-4" />
                Amount
                {isIncome && !payrollEnabled && (
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">(net income, after taxes)</span>
                )}
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl h-12"
                disabled={payrollEnabled && isIncome}
              />
              {payrollEnabled && isIncome && (
                <p className="text-[10px] text-muted-foreground">
                  ✨ Amount auto-calculated from payroll breakdown below
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                Description
              </Label>
              <Input
                placeholder={isIncome ? "e.g., Monthly salary, Freelance project" : "e.g., Groceries, Gas, Netflix"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Merchant/Source */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {isIncome ? "Merchant / Source" : "Merchant / Source"}
              </Label>
              <Input
                placeholder={isIncome ? "e.g., Employer name, Client" : "e.g., Store name, Vendor"}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>

            {/* Income Source Tag (Income only) */}
            {isIncome && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  Income Source
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    list="income-sources-list"
                    placeholder="e.g., Delta Airlines, Real Estate, Freelance"
                    value={incomeSource}
                    onChange={(e) => setIncomeSource(e.target.value)}
                  />
                  <datalist id="income-sources-list">
                    {previousSources.map((src) => (
                      <option key={src} value={src} />
                    ))}
                  </datalist>
                </div>
                {previousSources.length > 0 && !incomeSource && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {previousSources.slice(0, 5).map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setIncomeSource(src)}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat.toLowerCase().replace(/[^a-z0-9]/g, "_")}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

            {/* Link to Account */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {isIncome ? "Deposit To Account" : "Deduct From Account"}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select value={accountId || "none"} onValueChange={(val) => setAccountId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="No account (manual tracking)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No account (manual tracking)</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}{acc.institution ? ` - ${acc.institution}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bloom Bursts (Expense Only) */}
            <AnimatePresence>
              {!isIncome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label className="flex items-center gap-1.5 text-amber-600">
                    <Zap className="h-4 w-4" />
                    Link to Bloom Bursts
                    <span className="text-muted-foreground text-xs">(Optional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Track this expense against specific spending limits
                  </p>
                  {bloomBursts.length > 0 ? (
                    <Select value={bloomBurstId || "none"} onValueChange={(val) => setBloomBurstId(val === "none" ? "" : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Bloom Burst" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {bloomBursts.map((burst) => (
                          <SelectItem key={burst.id} value={burst.id}>
                            {burst.name} (${burst.spent_amount.toFixed(0)} / ${burst.limit_amount.toFixed(0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground/70 italic py-2 px-3 bg-muted/50 rounded-lg">
                      No active Bloom Bursts. Create one from the dashboard to track spending limits.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recurring Toggle */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Recurring {isIncome ? "Income" : "Expense"}</span>
                </div>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                💡 Recurring transactions will auto-generate on schedule
              </p>
              
              {/* Recurrence Pattern (shown when recurring is enabled) */}
              <AnimatePresence>
                {isRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <RecurrencePatternSelect
                      value={recurrencePattern}
                      onChange={setRecurrencePattern}
                      transactionDate={transactionDate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Payroll Breakdown (Income Only) */}
            <AnimatePresence>
              {isIncome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <PayrollBreakdown
                    enabled={payrollEnabled}
                    onToggle={setPayrollEnabled}
                    onPayrollChange={setPayrollData}
                    onNetPayChange={(netPay) => {
                      if (payrollEnabled) {
                        setAmount(netPay > 0 ? String(netPay) : "");
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!isIncome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border p-4"
                >
                  <ReceiptUploadSection
                    receiptUrl={receiptUrl}
                    onReceiptChange={setReceiptUrl}
                    disabled={loading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tax Deductible (Expense Only) */}
            <AnimatePresence>
              {!isIncome && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border p-4 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Tax Deductible</span>
                    </div>
                    <Switch checked={isTaxDeductible} onCheckedChange={setIsTaxDeductible} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mark if this expense is tax deductible
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <StickyNote className="h-4 w-4" />
                Notes
                <span className="text-muted-foreground text-xs">(Optional)</span>
              </Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t bg-background px-4 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={`flex-1 h-12 text-base font-semibold ${
                isIncome 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {loading ? "Adding..." : `Add ${isIncome ? "Income" : "Expense"}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 border-primary text-primary"
            >
              Close
            </Button>
          </div>
        </div>
    </ResponsiveModal>
  );
};
