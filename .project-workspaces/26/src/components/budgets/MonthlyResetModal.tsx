import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

interface MonthlyResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ResetMode = "reset" | "rollover";

const MonthlyResetModal = ({ open, onOpenChange, onSuccess }: MonthlyResetModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState<ResetMode>("reset");
  const [confirmed, setConfirmed] = useState(false);

  const handleReset = async () => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    setLoading(true);
    try {
      if (resetMode === "reset") {
        // Reset all budgets to 0 spent
        const { error } = await supabase
          .from("budgets")
          .update({ spent: 0 })
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (error) throw error;
        toast.success("All budgets reset to $0 spent");
      } else {
        // Rollover: Calculate remaining and add to next month's budget
        const { data: budgets, error: fetchError } = await supabase
          .from("budgets")
          .select("id, amount, spent")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (fetchError) throw fetchError;

        // For each budget, if under budget, add surplus to amount; reset spent to 0
        for (const budget of budgets || []) {
          const remaining = Number(budget.amount) - Number(budget.spent);
          const newAmount = remaining > 0 
            ? Number(budget.amount) + remaining 
            : Number(budget.amount);

          await supabase
            .from("budgets")
            .update({ 
              amount: newAmount,
              spent: 0 
            })
            .eq("id", budget.id);
        }

        toast.success("Budgets rolled over with surplus added");
      }

      setConfirmed(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error resetting budgets:", error);
      toast.error("Failed to reset budgets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setConfirmed(false); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Monthly Budget Reset
          </DialogTitle>
          <DialogDescription>
            Start fresh for the new month or roll over remaining funds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Reset mode selection */}
          <RadioGroup value={resetMode} onValueChange={(v) => setResetMode(v as ResetMode)}>
            <div className="space-y-3">
              <label
                htmlFor="reset"
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  resetMode === "reset" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="reset" id="reset" className="mt-1" />
                <div>
                  <p className="font-semibold">Fresh Start</p>
                  <p className="text-sm text-muted-foreground">
                    Reset all budgets to $0 spent. Budget amounts stay the same.
                  </p>
                </div>
              </label>

              <label
                htmlFor="rollover"
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  resetMode === "rollover" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="rollover" id="rollover" className="mt-1" />
                <div>
                  <p className="font-semibold">Rollover Surplus</p>
                  <p className="text-sm text-muted-foreground">
                    Add unspent money to next month's budget. Spent resets to $0.
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium text-sm mb-2">What will happen:</h4>
            {resetMode === "reset" ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All "Spent" amounts become $0</li>
                <li>• Budget limits remain unchanged</li>
                <li>• Transaction history is preserved</li>
              </ul>
            ) : (
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unspent amounts added to budgets</li>
                <li>• All "Spent" amounts become $0</li>
                <li>• Over-budget categories stay the same</li>
              </ul>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              This action cannot be undone. Make sure you've reviewed your spending before resetting.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">I understand and want to proceed</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              disabled={loading || !confirmed}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {resetMode === "reset" ? "Reset Budgets" : "Rollover & Reset"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MonthlyResetModal;
