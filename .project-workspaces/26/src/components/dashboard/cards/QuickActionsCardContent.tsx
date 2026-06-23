import { useState, forwardRef } from "react";
import { 
  Plus, 
  ArrowLeftRight, 
  Receipt, 
  CreditCard, 
  Target, 
  Bell,
  PiggyBank,
  TrendingUp,
  FileText,
  Repeat,
  Calculator,
  BarChart3,
  LucideIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { TransferModal } from "@/components/transactions/TransferModal";
import { AddAccountModal } from "@/components/accounts/AddAccountModal";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import { ReceiptScannerModal } from "@/components/transactions/ReceiptScannerModal";
import { RemindersAlertsModal } from "@/components/dashboard/RemindersAlertsModal";

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  route?: string;
  action?: "add-transaction" | "add-bill" | "add-account" | "add-goal" | "transfer" | "add-budget" | "reminders" | "receipt";
  defaultType?: "income" | "expense";
}

const actions: QuickAction[] = [
  { id: "add-transaction", icon: Plus, label: "Income/Expense", color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-500/20", action: "add-transaction", defaultType: "income" },
  { id: "add-bill", icon: Receipt, label: "Add Bill", color: "text-orange-500", bgColor: "bg-orange-100 dark:bg-orange-500/20", action: "add-bill" },
  { id: "add-account", icon: CreditCard, label: "Add Account", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-500/20", action: "add-account" },
  { id: "transfer", icon: ArrowLeftRight, label: "Transfer", color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-500/20", action: "transfer" },
  { id: "receipt", icon: Receipt, label: "Receipt", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-500/20", action: "receipt" },
  { id: "goals", icon: Target, label: "Goals", color: "text-teal-500", bgColor: "bg-teal-100 dark:bg-teal-500/20", action: "add-goal" },
  { id: "reminders", icon: Bell, label: "Reminders", color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-500/20", action: "reminders" },
  { id: "budget", icon: Calculator, label: "Budget", color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-500/20", action: "add-budget" },
];

const expandedActions: QuickAction[] = [
  ...actions,
  { id: "savings", icon: PiggyBank, label: "Savings", color: "text-cyan-500", bgColor: "bg-cyan-100 dark:bg-cyan-500/20", route: "/goals" },
  { id: "invest", icon: TrendingUp, label: "Invest", color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-500/20", route: "/accounts" },
  { id: "reports", icon: FileText, label: "Reports", color: "text-slate-500", bgColor: "bg-slate-100 dark:bg-slate-500/20", route: "/reports" },
  { id: "recurring", icon: Repeat, label: "Recurring", color: "text-violet-500", bgColor: "bg-violet-100 dark:bg-violet-500/20", route: "/bills" },
  { id: "analytics", icon: BarChart3, label: "Analytics", color: "text-gray-500", bgColor: "bg-gray-100 dark:bg-gray-500/20", route: "/reports" },
];

// Remove duplicate imports that were at top - keeping inline for AddBillDrawer below

const AddBillDrawer = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const categories = ["utilities", "subscriptions", "insurance", "rent", "phone", "internet", "streaming", "gym", "transportation", "loans", "credit_card", "other"];

  const resetForm = () => {
    setName("");
    setAmount("");
    setDueDate("");
    setCategory("");
  };

  const handleSubmit = async () => {
    if (!user || !name || !amount || !dueDate) {
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("bills").insert([{
      user_id: user.id,
      name,
      amount: parseFloat(amount),
      due_date: dueDate,
      category: (category || "other") as "utilities" | "subscriptions" | "insurance" | "rent" | "phone" | "internet" | "streaming" | "gym" | "transportation" | "loans" | "credit_card" | "other",
    }]);

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to add bill", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Bill added successfully" });
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DrawerContent className="max-h-[80vh] flex flex-col">
        <DrawerHeader className="px-4 pb-2 flex-shrink-0">
          <DrawerTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-500" />
            Add Bill
          </DrawerTitle>
        </DrawerHeader>
        
        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0">
          <div className="space-y-4 pb-4">
            <div>
              <Label>Bill Name *</Label>
              <Input 
                placeholder="e.g., Electric Bill" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Sticky footer with buttons - always visible */}
        <div className="flex-shrink-0 border-t bg-background px-4 py-4 pb-[env(safe-area-inset-bottom,16px)]">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600">
              {loading ? "Adding..." : "Add Bill"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export const QuickActionsCardContent = forwardRef<HTMLDivElement>((_props, ref) => {
  const navigate = useNavigate();
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);

  const handleAction = (action: QuickAction) => {
    if (action.action === "add-transaction") {
      setTransactionType(action.defaultType || "income");
      setTransactionModalOpen(true);
    } else if (action.action === "add-bill") {
      setBillModalOpen(true);
    } else if (action.action === "transfer") {
      setTransferModalOpen(true);
    } else if (action.action === "add-account") {
      setAccountModalOpen(true);
    } else if (action.action === "add-goal") {
      setGoalModalOpen(true);
    } else if (action.action === "add-budget") {
      setBudgetModalOpen(true);
    } else if (action.action === "receipt") {
      setReceiptModalOpen(true);
    } else if (action.action === "reminders") {
      setRemindersModalOpen(true);
    } else if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <div ref={ref}>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Fast access to common financial tasks</p>
        <div className="grid grid-cols-4 gap-2">
          {actions.slice(0, 8).map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl ${action.bgColor} transition-all duration-200 active:scale-95 hover:opacity-80`}
            >
              <action.icon className={`h-4 w-4 ${action.color}`} />
              <span className="text-[9px] mt-1 text-foreground/80 text-center leading-tight">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal 
        open={transactionModalOpen} 
        onOpenChange={setTransactionModalOpen} 
        defaultType={transactionType}
      />
      <AddBillDrawer open={billModalOpen} onOpenChange={setBillModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <AddAccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} />
      <CreateGoalModal open={goalModalOpen} onOpenChange={setGoalModalOpen} />
      <CreateBudgetModal open={budgetModalOpen} onOpenChange={setBudgetModalOpen} />
      <ReceiptScannerModal open={receiptModalOpen} onOpenChange={setReceiptModalOpen} />
      <RemindersAlertsModal open={remindersModalOpen} onOpenChange={setRemindersModalOpen} />
    </div>
  );
});
QuickActionsCardContent.displayName = "QuickActionsCardContent";

export const QuickActionsExpandedContent = forwardRef<HTMLDivElement>((_props, ref) => {
  const navigate = useNavigate();
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);

  const handleAction = (action: QuickAction) => {
    if (action.action === "add-transaction") {
      setTransactionType(action.defaultType || "income");
      setTransactionModalOpen(true);
    } else if (action.action === "add-bill") {
      setBillModalOpen(true);
    } else if (action.action === "transfer") {
      setTransferModalOpen(true);
    } else if (action.action === "add-account") {
      setAccountModalOpen(true);
    } else if (action.action === "add-goal") {
      setGoalModalOpen(true);
    } else if (action.action === "add-budget") {
      setBudgetModalOpen(true);
    } else if (action.action === "receipt") {
      setReceiptModalOpen(true);
    } else if (action.action === "reminders") {
      setRemindersModalOpen(true);
    } else if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <div ref={ref}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">All available quick actions</p>
        <div className="grid grid-cols-4 gap-3">
          {expandedActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={`flex flex-col items-center justify-center p-4 rounded-xl ${action.bgColor} transition-all duration-200 active:scale-95 hover:opacity-80`}
            >
              <action.icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-xs mt-2 text-foreground/80 text-center leading-tight font-medium">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AddTransactionModal 
        open={transactionModalOpen} 
        onOpenChange={setTransactionModalOpen} 
        defaultType={transactionType}
      />
      <AddBillDrawer open={billModalOpen} onOpenChange={setBillModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <AddAccountModal open={accountModalOpen} onOpenChange={setAccountModalOpen} />
      <CreateGoalModal open={goalModalOpen} onOpenChange={setGoalModalOpen} />
      <CreateBudgetModal open={budgetModalOpen} onOpenChange={setBudgetModalOpen} />
      <ReceiptScannerModal open={receiptModalOpen} onOpenChange={setReceiptModalOpen} />
      <RemindersAlertsModal open={remindersModalOpen} onOpenChange={setRemindersModalOpen} />
    </div>
  );
});
QuickActionsExpandedContent.displayName = "QuickActionsExpandedContent";
