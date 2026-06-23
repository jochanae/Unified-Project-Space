import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, X, TrendingDown, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DebtPromptData {
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
}

interface LinkedRecordPromptProps {
  /** What was just created */
  createdType: "account" | "debt";
  createdName: string;
  /** What to prompt creating next */
  promptType: "debt" | "bill" | "both";
  /** Current step in the flow: 'debt' or 'bill' */
  currentStep?: "debt" | "bill";
  onCreateDebt?: (data: DebtPromptData) => void;
  onCreateBill?: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export function LinkedRecordPrompt({
  createdType,
  createdName,
  promptType,
  currentStep,
  onCreateDebt,
  onCreateBill,
  onSkip,
  isLoading,
}: LinkedRecordPromptProps) {
  const [interestRate, setInterestRate] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [dueDay, setDueDay] = useState("");

  const step = currentStep || (promptType === "both" ? "debt" : promptType);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
      >
        {step === "debt" && onCreateDebt && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">
                <strong>{createdName}</strong> added to Accounts
              </span>
            </div>

            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Track payoff details?</p>
                  <p className="text-xs text-muted-foreground">
                    Add interest rate & minimum payment for debt payoff tracking
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">APR %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="18.99"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Payment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="75"
                    value={minimumPayment}
                    onChange={(e) => setMinimumPayment(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Due Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={() =>
                    onCreateDebt({ interestRate, minimumPayment, dueDay })
                  }
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Add to Debt Tracker
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  <X className="h-3 w-3 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "bill" && onCreateBill && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">
                <strong>{createdName}</strong> added to{" "}
                {createdType === "account" ? "Accounts & Debts" : "Debts"}
              </span>
            </div>

            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">
                    Track as a recurring bill?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Set up monthly bill reminders & payment tracking
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                  onClick={onCreateBill}
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  Add to Bills
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  <X className="h-3 w-3 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
