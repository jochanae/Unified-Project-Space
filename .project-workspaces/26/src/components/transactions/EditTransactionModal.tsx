import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Minus, 
  DollarSign, 
  FileText, 
  Building2, 
  Calendar, 
  Repeat, 
  Shield, 
  StickyNote,
  X,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  transaction_date: string;
  merchant: string | null;
  account_id: string | null;
  bloom_burst_id: string | null;
  is_recurring: boolean;
  is_tax_deductible: boolean;
  notes: string | null;
}

interface Account {
  id: string;
  name: string;
  institution: string | null;
}

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onSuccess: () => void;
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

export const EditTransactionModal = ({ 
  open, 
  onOpenChange, 
  transaction,
  onSuccess
}: EditTransactionModalProps) => {
  const { user } = useAuth();
  
  // Form state
  const [type, setType] = useState<"income" | "expense">(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.title);
  const [merchant, setMerchant] = useState(transaction.merchant || "");
  const [category, setCategory] = useState(transaction.category);
  const [transactionDate, setTransactionDate] = useState(transaction.transaction_date);
  const [accountId, setAccountId] = useState<string>(transaction.account_id || "");
  const [isRecurring, setIsRecurring] = useState(transaction.is_recurring);
  const [isTaxDeductible, setIsTaxDeductible] = useState(transaction.is_tax_deductible);
  const [notes, setNotes] = useState(transaction.notes || "");
  const [loading, setLoading] = useState(false);
  
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Reset form when transaction changes
  useEffect(() => {
    setType(transaction.type);
    setAmount(String(transaction.amount));
    setDescription(transaction.title);
    setMerchant(transaction.merchant || "");
    setCategory(transaction.category);
    setTransactionDate(transaction.transaction_date);
    setAccountId(transaction.account_id || "");
    setIsRecurring(transaction.is_recurring);
    setIsTaxDeductible(transaction.is_tax_deductible);
    setNotes(transaction.notes || "");
  }, [transaction]);

  // Fetch accounts
  useEffect(() => {
    if (open && user) {
      supabase
        .from("accounts")
        .select("id, name, institution")
        .eq("user_id", user.id)
        .order("name")
        .then(({ data }) => {
          if (data) setAccounts(data);
        });
    }
  }, [open, user]);

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
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          amount: parseFloat(amount),
          title: description,
          type,
          category: category || "other",
          transaction_date: transactionDate,
          merchant: merchant || null,
          account_id: accountId || null,
          is_recurring: isRecurring,
          is_tax_deductible: type === "expense" ? isTaxDeductible : false,
          notes: notes || null,
        })
        .eq("id", transaction.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Transaction updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast.error("Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const isIncome = type === "income";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col rounded-t-3xl">
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
                <h2 className="text-lg font-semibold">Edit Transaction</h2>
                <p className="text-xs text-muted-foreground">Update transaction details</p>
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
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <div className="space-y-4 py-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className={`flex items-center gap-1.5 ${isIncome ? "text-emerald-600" : "text-red-500"}`}>
                <DollarSign className="h-4 w-4" />
                Amount
              </Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl h-12"
              />
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
                Merchant / Source
              </Label>
              <Input
                placeholder={isIncome ? "e.g., Employer name, Client" : "e.g., Store name, Vendor"}
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>

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

            {/* Recurring Toggle */}
            <div className="rounded-xl border p-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Recurring {isIncome ? "Income" : "Expense"}</span>
                </div>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
            </div>

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
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t bg-background">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${isIncome ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-500 hover:bg-red-600"}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
