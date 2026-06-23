import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Home, Car, ArrowRight, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** Asset types that commonly have associated liabilities */
export const ASSET_LIABILITY_MAP: Record<string, { label: string; defaultLiabilityType: string; liabilityLabel: string }> = {
  real_estate: { label: "home", defaultLiabilityType: "mortgage", liabilityLabel: "Mortgage" },
  vehicle: { label: "vehicle", defaultLiabilityType: "auto_loan", liabilityLabel: "Auto Loan" },
};

const LIABILITY_OPTIONS = [
  { value: "mortgage", label: "Mortgage" },
  { value: "heloc", label: "HELOC" },
  { value: "auto_loan", label: "Auto Loan" },
  { value: "personal_loan", label: "Personal Loan" },
  { value: "other", label: "Other Loan" },
];

export interface AssetLiabilityData {
  liabilityType: string;
  loanBalance: string;
  interestRate: string;
  minimumPayment: string;
  dueDay: string;
  lender: string;
}

interface AssetLiabilityPromptProps {
  assetName: string;
  assetType: string;
  onCreateLiability: (data: AssetLiabilityData) => void;
  onSkip: () => void;
  onPaidOff: () => void;
  isLoading?: boolean;
}

export function AssetLiabilityPrompt({
  assetName,
  assetType,
  onCreateLiability,
  onSkip,
  onPaidOff,
  isLoading,
}: AssetLiabilityPromptProps) {
  const config = ASSET_LIABILITY_MAP[assetType];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AssetLiabilityData>({
    liabilityType: config?.defaultLiabilityType || "mortgage",
    loanBalance: "",
    interestRate: "",
    minimumPayment: "",
    dueDay: "",
    lender: "",
  });

  const icon = assetType === "real_estate" 
    ? <Home className="h-5 w-5 text-primary" /> 
    : <Car className="h-5 w-5 text-primary" />;

  if (!config) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={showForm ? "form" : "choice"}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">
            <strong>{assetName}</strong> added to Assets
          </span>
        </div>

        {!showForm ? (
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <p className="font-semibold text-sm">
                  Does this {config.label} have a loan or mortgage?
                </p>
                <p className="text-xs text-muted-foreground">
                  We'll auto-create the liability account, debt tracker & bill
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={() => setShowForm(true)}
                disabled={isLoading}
              >
                <ArrowRight className="h-3 w-3 mr-1" />
                Yes, add loan details
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={onPaidOff}
                  disabled={isLoading}
                >
                  No, it's paid off
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center gap-2">
              {icon}
              <p className="font-semibold text-sm">Loan Details for {assetName}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Loan Type</Label>
                <Select
                  value={form.liabilityType}
                  onValueChange={(v) => setForm({ ...form, liabilityType: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Lender / Institution</Label>
                <Input
                  placeholder="e.g., Wells Fargo"
                  value={form.lender}
                  onChange={(e) => setForm({ ...form, lender: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Loan Balance *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="250000"
                    value={form.loanBalance}
                    onChange={(e) => setForm({ ...form, loanBalance: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">APR %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="6.5"
                    value={form.interestRate}
                    onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Monthly Payment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="1800"
                    value={form.minimumPayment}
                    onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Due Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                    value={form.dueDay}
                    onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={isLoading || !form.loanBalance}
                onClick={() => onCreateLiability(form)}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ArrowRight className="h-3 w-3 mr-1" />
                )}
                Create Liability + Debt + Bill
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onSkip}
                disabled={isLoading}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
