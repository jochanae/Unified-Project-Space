import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Briefcase, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PayrollData {
  gross_pay: number;
  federal_tax: number;
  state_tax: number;
  local_tax: number;
  social_security: number;
  medicare: number;
  retirement_401k: number;
  health_insurance: number;
  dental_insurance: number;
  vision_insurance: number;
  hsa: number;
  fsa: number;
  life_insurance: number;
  disability_insurance: number;
  union_dues: number;
  other_deductions: number;
  other_deductions_label: string;
  net_pay: number;
  pay_period: string;
  employer_name: string;
}

const emptyPayroll: PayrollData = {
  gross_pay: 0,
  federal_tax: 0,
  state_tax: 0,
  local_tax: 0,
  social_security: 0,
  medicare: 0,
  retirement_401k: 0,
  health_insurance: 0,
  dental_insurance: 0,
  vision_insurance: 0,
  hsa: 0,
  fsa: 0,
  life_insurance: 0,
  disability_insurance: 0,
  union_dues: 0,
  other_deductions: 0,
  other_deductions_label: "",
  net_pay: 0,
  pay_period: "",
  employer_name: "",
};

interface PayrollBreakdownProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onPayrollChange: (data: PayrollData) => void;
  onNetPayChange: (netPay: number) => void;
}

const deductionFields = [
  { key: "federal_tax", label: "Federal Tax", group: "taxes" },
  { key: "state_tax", label: "State Tax", group: "taxes" },
  { key: "local_tax", label: "Local Tax", group: "taxes" },
  { key: "social_security", label: "Social Security", group: "taxes" },
  { key: "medicare", label: "Medicare", group: "taxes" },
  { key: "retirement_401k", label: "401(k) / Retirement", group: "benefits" },
  { key: "health_insurance", label: "Health Insurance", group: "benefits" },
  { key: "dental_insurance", label: "Dental Insurance", group: "benefits" },
  { key: "vision_insurance", label: "Vision Insurance", group: "benefits" },
  { key: "hsa", label: "HSA", group: "benefits" },
  { key: "fsa", label: "FSA", group: "benefits" },
  { key: "life_insurance", label: "Life Insurance", group: "benefits" },
  { key: "disability_insurance", label: "Disability Insurance", group: "benefits" },
  { key: "union_dues", label: "Union Dues", group: "other" },
  { key: "other_deductions", label: "Other Deductions", group: "other" },
] as const;

export const PayrollBreakdown = ({ enabled, onToggle, onPayrollChange, onNetPayChange }: PayrollBreakdownProps) => {
  const [payroll, setPayroll] = useState<PayrollData>(emptyPayroll);
  const [showAllDeductions, setShowAllDeductions] = useState(false);

  // Calculate net pay whenever payroll changes
  useEffect(() => {
    if (!enabled) return;
    
    const totalDeductions = 
      payroll.federal_tax + payroll.state_tax + payroll.local_tax +
      payroll.social_security + payroll.medicare + payroll.retirement_401k +
      payroll.health_insurance + payroll.dental_insurance + payroll.vision_insurance +
      payroll.hsa + payroll.fsa + payroll.life_insurance + 
      payroll.disability_insurance + payroll.union_dues + payroll.other_deductions;
    
    const netPay = Math.max(0, payroll.gross_pay - totalDeductions);
    const updated = { ...payroll, net_pay: netPay };
    setPayroll(updated);
    onPayrollChange(updated);
    onNetPayChange(netPay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled, payroll.gross_pay, payroll.federal_tax, payroll.state_tax, 
    payroll.local_tax, payroll.social_security, payroll.medicare,
    payroll.retirement_401k, payroll.health_insurance, payroll.dental_insurance,
    payroll.vision_insurance, payroll.hsa, payroll.fsa, payroll.life_insurance,
    payroll.disability_insurance, payroll.union_dues, payroll.other_deductions,
  ]);

  const updateField = (key: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setPayroll(prev => ({ ...prev, [key]: numVal }));
  };

  const totalDeductions = 
    payroll.federal_tax + payroll.state_tax + payroll.local_tax +
    payroll.social_security + payroll.medicare + payroll.retirement_401k +
    payroll.health_insurance + payroll.dental_insurance + payroll.vision_insurance +
    payroll.hsa + payroll.fsa + payroll.life_insurance + 
    payroll.disability_insurance + payroll.union_dues + payroll.other_deductions;

  // Common deductions shown by default
  const commonFields = deductionFields.filter(f => 
    ["federal_tax", "state_tax", "social_security", "medicare", "retirement_401k", "health_insurance"].includes(f.key)
  );
  const extraFields = deductionFields.filter(f => 
    !["federal_tax", "state_tax", "social_security", "medicare", "retirement_401k", "health_insurance"].includes(f.key)
  );

  const visibleFields = showAllDeductions ? deductionFields : commonFields;

  return (
    <div className="rounded-xl border p-4 space-y-3">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Detailed Payroll Breakdown</span>
        </div>
        <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${enabled ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'}`}>
          <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform" />
        </div>
      </button>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" />
        Optional: Enter gross pay & deductions to auto-calculate net
      </p>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Employer & Pay Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Employer</Label>
                <Input
                  placeholder="Company name"
                  value={payroll.employer_name}
                  onChange={(e) => setPayroll(prev => ({ ...prev, employer_name: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Pay Period</Label>
                <Select value={payroll.pay_period || "none"} onValueChange={(v) => setPayroll(prev => ({ ...prev, pay_period: v === "none" ? "" : v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Gross Pay */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-emerald-600">Gross Pay (Before Taxes)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={payroll.gross_pay || ""}
                onChange={(e) => updateField("gross_pay", e.target.value)}
                className="h-10 text-lg font-semibold border-emerald-200 focus:border-emerald-400"
              />
            </div>

            {/* Deductions */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-orange-600">Deductions</Label>
              <div className="grid grid-cols-2 gap-2">
                {visibleFields.map((field) => (
                  <div key={field.key} className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">{field.label}</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={(payroll[field.key as keyof PayrollData] as number) || ""}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>

              {/* Show more/less */}
              {extraFields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllDeductions(!showAllDeductions)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {showAllDeductions ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show fewer deductions
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show all deductions ({extraFields.length} more)
                    </>
                  )}
                </button>
              )}

              {/* Other deductions label */}
              <AnimatePresence>
                {showAllDeductions && payroll.other_deductions > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-0.5"
                  >
                    <Label className="text-[10px] text-muted-foreground">Other Deductions Label</Label>
                    <Input
                      placeholder="e.g., Parking, Charity"
                      value={payroll.other_deductions_label}
                      onChange={(e) => setPayroll(prev => ({ ...prev, other_deductions_label: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Pay</span>
                <span className="font-medium text-emerald-600">${payroll.gross_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Deductions</span>
                <span className="font-medium text-orange-600">-${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
                <span>Net Pay (Take-Home)</span>
                <span className="text-emerald-600">${payroll.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                This net amount will be used as your income transaction
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
