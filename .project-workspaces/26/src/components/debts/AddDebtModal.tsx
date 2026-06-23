import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Link2, ExternalLink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LinkedRecordPrompt } from "@/components/shared/LinkedRecordPrompt";
import {
  debtTypeToBillCategory,
  createLinkedBill,
  findLinkedBill,
} from "@/utils/linkedRecordHelpers";

interface AddDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Account {
  id: string;
  name: string;
  institution: string | null;
  account_type: string;
  category: string;
}

const debtTypes = [
  { value: "credit_card", label: "Credit Card" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "student_loan", label: "Student Loan" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "medical", label: "Medical Debt" },
  { value: "other", label: "Other" },
];

type FlowStep = "form" | "prompt-bill" | "done";

export function AddDebtModal({ open, onOpenChange, onSuccess }: AddDebtModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    creditor: "",
    debt_type: "credit_card",
    current_balance: "",
    original_balance: "",
    interest_rate: "",
    minimum_payment: "",
    due_day: "",
    linked_account_id: "",
    remaining_term_months: "",
    payment_url: "",
    notes: "",
  });

  // Linked record flow state
  const [flowStep, setFlowStep] = useState<FlowStep>("form");
  const [createdDebtId, setCreatedDebtId] = useState<string | null>(null);
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  // Fetch liability accounts for linking
  useEffect(() => {
    if (open && user) {
      supabase
        .from("accounts")
        .select("id, name, institution, account_type, category")
        .eq("user_id", user.id)
        .eq("category", "liability")
        .order("name", { ascending: true })
        .then(({ data }) => {
          if (data) setAccounts(data);
        });
    }
  }, [open, user]);

  const getAccountType = (debtType: string): "credit_card" | "personal_loan" | "student_loan" | "auto_loan" | "mortgage" | "line_of_credit" => {
    switch (debtType) {
      case "credit_card": return "credit_card";
      case "personal_loan": return "personal_loan";
      case "student_loan": return "student_loan";
      case "auto_loan": return "auto_loan";
      case "mortgage": return "mortgage";
      case "medical":
      case "other":
      default: return "personal_loan";
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      creditor: "",
      debt_type: "credit_card",
      current_balance: "",
      original_balance: "",
      interest_rate: "",
      minimum_payment: "",
      due_day: "",
      linked_account_id: "",
      remaining_term_months: "",
      payment_url: "",
      notes: "",
    });
    setFlowStep("form");
    setCreatedDebtId(null);
    setCreatedAccountId(null);
  };

  const handleSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    const currentBalance = parseFloat(formData.current_balance) || 0;
    const originalBalance = parseFloat(formData.original_balance) || currentBalance;

    let linkedAccountId = formData.linked_account_id || null;

    // Auto-create a liability account if not linking to an existing one
    if (!linkedAccountId) {
      const { data: newAccount, error: accountError } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: formData.name,
          institution: formData.creditor || null,
          account_type: getAccountType(formData.debt_type),
          category: "liability",
          balance: currentBalance,
          is_manual: true,
        })
        .select("id")
        .single();

      if (accountError) {
        console.error("Error creating liability account:", accountError);
      } else if (newAccount) {
        linkedAccountId = newAccount.id;
        toast.success("Liability account auto-created in Accounts", {
          description: `"${formData.name}" has been added to your Accounts page.`,
          action: {
            label: "View",
            onClick: () => window.location.href = "/accounts",
          },
        });
      }
    }

    const { data: debtData, error } = await supabase.from("debts").insert({
      user_id: user.id,
      name: formData.name,
      creditor: formData.creditor || null,
      debt_type: formData.debt_type,
      current_balance: currentBalance,
      original_balance: originalBalance,
      interest_rate: parseFloat(formData.interest_rate) || 0,
      minimum_payment: parseFloat(formData.minimum_payment) || 0,
      due_day: formData.due_day ? parseInt(formData.due_day) : null,
      linked_account_id: linkedAccountId,
      status: "active",
      remaining_term_months: formData.remaining_term_months ? parseInt(formData.remaining_term_months) : null,
      payment_url: formData.payment_url.trim() || null,
      notes: formData.notes.trim() || null,
    }).select("id").single();

    setIsSubmitting(false);

    if (error) {
      console.error("Error adding debt:", error);
      toast.error("Failed to add debt");
    } else {
      toast.success("Debt added successfully");
      onSuccess();

      // Check if a bill already exists for this account/debt
      const existingBill = await findLinkedBill({
        accountId: linkedAccountId,
        debtId: debtData?.id,
      });

      if (existingBill) {
        // Bill already exists, no need to prompt
        if (addAnother) {
          resetForm();
        } else {
          onOpenChange(false);
          resetForm();
        }
      } else if (debtData && !addAnother) {
        // Show bill creation prompt
        setCreatedDebtId(debtData.id);
        setCreatedAccountId(linkedAccountId);
        setFlowStep("prompt-bill");
      } else if (addAnother) {
        resetForm();
      } else {
        onOpenChange(false);
        resetForm();
      }
    }
  };

  const handleCreateBill = async () => {
    if (!user) return;
    setLinkLoading(true);

    try {
      const result = await createLinkedBill({
        userId: user.id,
        name: formData.name,
        amount: parseFloat(formData.minimum_payment) || parseFloat(formData.current_balance) || 0,
        category: debtTypeToBillCategory(formData.debt_type),
        dueDay: formData.due_day ? parseInt(formData.due_day) : null,
        linkedAccountId: createdAccountId,
        linkedDebtId: createdDebtId,
      });

      if (result.alreadyExisted) {
        toast.info("Bill already exists for this debt");
      } else {
        toast.success("Added to Bills!");
      }

      onSuccess();
    } catch (err) {
      console.error("Error creating linked bill:", err);
      toast.error("Failed to create bill entry");
    } finally {
      setLinkLoading(false);
      onOpenChange(false);
      resetForm();
    }
  };

  const handleSkipBill = () => {
    onOpenChange(false);
    resetForm();
  };

  const isFormStep = flowStep === "form";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isFormStep ? "Add New Debt" : ""}</DialogTitle>
        </DialogHeader>

        {isFormStep ? (
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">Debt Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Chase Sapphire Credit Card"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditor">Creditor/Lender</Label>
              <Input
                id="creditor"
                placeholder="e.g., Chase Bank"
                value={formData.creditor}
                onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Debt Type</Label>
              <Select
                value={formData.debt_type}
                onValueChange={(value) => setFormData({ ...formData, debt_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debtTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_balance">Current Balance *</Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.current_balance}
                  onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="original_balance">Original Balance</Label>
                <Input
                  id="original_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.original_balance}
                  onChange={(e) => setFormData({ ...formData, original_balance: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="18.99"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum_payment">Min Payment</Label>
                <Input
                  id="minimum_payment"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="75"
                  value={formData.minimum_payment}
                  onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_day">Due Day of Month</Label>
                <Input
                  id="due_day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="15"
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remaining_term_months">Months Left</Label>
                <Input
                  id="remaining_term_months"
                  type="number"
                  min="0"
                  max="600"
                  placeholder="e.g., 36"
                  value={formData.remaining_term_months}
                  onChange={(e) => setFormData({ ...formData, remaining_term_months: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Remaining months on the loan</p>
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="payment_url" className="flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="payment_url"
                type="url"
                placeholder="https://www.lender.com/pay"
                value={formData.payment_url}
                onChange={(e) => setFormData({ ...formData, payment_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Link to the website for this account</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Link to Account */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Link to Account (optional)
                </Label>
                <Select
                  value={formData.linked_account_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, linked_account_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a liability account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (auto-create)</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.institution ? `(${account.institution})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link to an existing account or auto-create one
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Debt
                </Button>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, true)}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save & Add Another
              </Button>
            </div>
          </form>
        ) : (
          <div className="py-2">
            <LinkedRecordPrompt
              createdType="debt"
              createdName={formData.name}
              promptType="bill"
              currentStep="bill"
              onCreateBill={handleCreateBill}
              onSkip={handleSkipBill}
              isLoading={linkLoading}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
