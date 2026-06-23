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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Edit2, ExternalLink } from "lucide-react";
import { z } from "zod";

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day: number | null;
  debt_type: string;
  status: string;
  notes: string | null;
  remaining_term_months?: number | null;
}

interface EditDebtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt;
  onSuccess: () => void;
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

const debtStatuses = [
  { value: "active", label: "Active" },
  { value: "paid_off", label: "Paid Off" },
  { value: "in_collections", label: "In Collections" },
  { value: "settled", label: "Settled" },
];

const editDebtSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  creditor: z.string().max(100, "Creditor name too long").optional(),
  interest_rate: z.number().min(0, "Must be positive").max(100, "Rate too high"),
  minimum_payment: z.number().min(0, "Must be positive").max(1000000, "Amount too large"),
  current_balance: z.number().min(0, "Must be positive").max(100000000, "Amount too large"),
  original_balance: z.number().min(0, "Must be positive").max(100000000, "Amount too large"),
  notes: z.string().max(500, "Notes too long").optional(),
});

export function EditDebtModal({ open, onOpenChange, debt, onSuccess }: EditDebtModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    creditor: "",
    debt_type: "credit_card",
    status: "active",
    current_balance: "",
    original_balance: "",
    interest_rate: "",
    minimum_payment: "",
    due_day: "",
    notes: "",
    payment_url: "",
    remaining_term_months: "",
  });

  useEffect(() => {
    if (open && debt) {
      setFormData({
        name: debt.name,
        creditor: debt.creditor || "",
        debt_type: debt.debt_type,
        status: debt.status,
        current_balance: debt.current_balance.toString(),
        original_balance: debt.original_balance.toString(),
        interest_rate: debt.interest_rate.toString(),
        minimum_payment: debt.minimum_payment.toString(),
        due_day: debt.due_day?.toString() || "",
        notes: debt.notes || "",
        payment_url: (debt as any).payment_url || "",
        remaining_term_months: debt.remaining_term_months?.toString() || "",
      });
      setErrors({});
    }
  }, [open, debt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate
    const result = editDebtSchema.safeParse({
      name: formData.name.trim(),
      creditor: formData.creditor.trim() || undefined,
      interest_rate: parseFloat(formData.interest_rate) || 0,
      minimum_payment: parseFloat(formData.minimum_payment) || 0,
      current_balance: parseFloat(formData.current_balance) || 0,
      original_balance: parseFloat(formData.original_balance) || 0,
      notes: formData.notes.trim() || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const { error } = await supabase
      .from("debts")
      .update({
        name: formData.name.trim(),
        creditor: formData.creditor.trim() || null,
        debt_type: formData.debt_type,
        status: formData.status,
        current_balance: parseFloat(formData.current_balance) || 0,
        original_balance: parseFloat(formData.original_balance) || parseFloat(formData.current_balance) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        minimum_payment: parseFloat(formData.minimum_payment) || 0,
        due_day: formData.due_day ? parseInt(formData.due_day) : null,
        notes: formData.notes.trim() || null,
        payment_url: formData.payment_url.trim() || null,
        remaining_term_months: formData.remaining_term_months ? parseInt(formData.remaining_term_months) : null,
      })
      .eq("id", debt.id);

    setIsSubmitting(false);

    if (error) {
      console.error("Error updating debt:", error);
      toast.error("Failed to update debt");
    } else {
      toast.success("Debt updated successfully");
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Edit Debt
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Debt Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Chase Sapphire Credit Card"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditor">Creditor/Lender</Label>
            <Input
              id="creditor"
              placeholder="e.g., Chase Bank"
              value={formData.creditor}
              onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
              maxLength={100}
            />
            {errors.creditor && <p className="text-sm text-destructive">{errors.creditor}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {debtStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {errors.current_balance && <p className="text-sm text-destructive">{errors.current_balance}</p>}
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
              {errors.original_balance && <p className="text-sm text-destructive">{errors.original_balance}</p>}
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
              {errors.interest_rate && <p className="text-sm text-destructive">{errors.interest_rate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_payment">Min Payment ($)</Label>
              <Input
                id="minimum_payment"
                type="number"
                step="0.01"
                min="0"
                placeholder="75"
                value={formData.minimum_payment}
                onChange={(e) => setFormData({ ...formData, minimum_payment: e.target.value })}
              />
              {errors.minimum_payment && <p className="text-sm text-destructive">{errors.minimum_payment}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_day">Due Day (1-31)</Label>
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
              <p className="text-xs text-muted-foreground">Remaining months on the loan contract</p>
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this debt..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 500) })}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">{formData.notes.length}/500</p>
            {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
          </div>

          <div className="flex gap-3 pt-4">
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
