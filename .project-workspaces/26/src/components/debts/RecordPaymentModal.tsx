import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, DollarSign, CalendarClock } from "lucide-react";
import { z } from "zod";

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: {
    id: string;
    name: string;
    current_balance: number;
  };
  onSuccess: () => void;
}

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount too large"),
  payment_type: z.enum(["minimum", "extra", "full"]),
  notes: z.string().max(500, "Notes too long").optional(),
});

export function RecordPaymentModal({ open, onOpenChange, debt, onSuccess }: RecordPaymentModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    payment_type: "minimum",
    notes: "",
    is_autopay: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amount = parseFloat(formData.amount);

    // Validate input
    const result = paymentSchema.safeParse({
      amount,
      payment_type: formData.payment_type,
      notes: formData.notes || undefined,
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

    try {
      // Record the payment
      const { error: paymentError } = await supabase.from("debt_payments").insert({
        user_id: user.id,
        debt_id: debt.id,
        amount: amount,
        payment_type: formData.payment_type,
        notes: formData.notes || null,
      });

      if (paymentError) throw paymentError;

      // Update the debt balance
      const newBalance = Math.max(0, debt.current_balance - amount);
      const updateData: Record<string, unknown> = { current_balance: newBalance };
      
      // Mark as paid off if balance is zero
      if (newBalance === 0) {
        updateData.status = "paid_off";
      }

      const { error: updateError } = await supabase
        .from("debts")
        .update(updateData)
        .eq("id", debt.id);

      if (updateError) throw updateError;

      toast.success(`Payment of $${amount.toLocaleString()} recorded!`);
      
      if (newBalance === 0) {
        toast.success("🎉 Congratulations! This debt is paid off!");
      }

      setFormData({ amount: "", payment_type: "minimum", notes: "", is_autopay: false });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAfterPayment = Math.max(
    0, 
    debt.current_balance - (parseFloat(formData.amount) || 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Debt Info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium">{debt.name}</p>
            <p className="text-sm text-muted-foreground">
              Current Balance:{" "}
              <span className="text-destructive font-semibold">
                ${Number(debt.current_balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={debt.current_balance}
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-7"
                required
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Type</Label>
            <Select
              value={formData.payment_type}
              onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimum">Minimum Payment</SelectItem>
                <SelectItem value="extra">Extra Payment</SelectItem>
                <SelectItem value="full">Full Payoff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Autopay Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="autopay" className="text-sm font-medium cursor-pointer">
                  Set as Autopay
                </Label>
                <p className="text-xs text-muted-foreground">
                  Remind me to make this payment monthly
                </p>
              </div>
            </div>
            <Switch
              id="autopay"
              checked={formData.is_autopay}
              onCheckedChange={(checked) => setFormData({ ...formData, is_autopay: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 500) })}
              rows={2}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          {/* Balance Preview */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200">
              <p className="text-sm">
                Remaining balance after payment:{" "}
                <span className={`font-semibold ${remainingAfterPayment === 0 ? "text-green-600" : ""}`}>
                  ${remainingAfterPayment.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </p>
              {remainingAfterPayment === 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  🎉 This will pay off the debt!
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
