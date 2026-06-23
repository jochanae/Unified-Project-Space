import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Calculator, Home, Car, CreditCard, TrendingDown, DollarSign,
  Calendar, Clock, ChevronDown, ChevronUp, Sparkles, ArrowRight,
  CheckCircle, AlertTriangle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

type DebtType = "mortgage" | "auto_loan" | "credit_card" | "personal_loan" | "student_loan";

interface PayoffResult {
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  payoffMonths: number;
  payoffDate: Date;
  schedule: AmortizationEntry[];
}

interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number;
  balance: number;
}

interface ScenarioResult {
  label: string;
  payoffMonths: number;
  totalInterest: number;
  totalPayments: number;
  monthsSaved: number;
  interestSaved: number;
}

const DEBT_TYPE_CONFIG: Record<DebtType, { label: string; icon: typeof Home; color: string }> = {
  mortgage: { label: "Mortgage", icon: Home, color: "text-blue-500" },
  auto_loan: { label: "Auto Loan", icon: Car, color: "text-emerald-500" },
  credit_card: { label: "Credit Card", icon: CreditCard, color: "text-orange-500" },
  personal_loan: { label: "Personal Loan", icon: DollarSign, color: "text-purple-500" },
  student_loan: { label: "Student Loan", icon: Calculator, color: "text-cyan-500" },
};

function calculateAmortization(
  balance: number,
  annualRate: number,
  termMonths: number,
  extraMonthly: number = 0,
  biweekly: boolean = false,
  lumpSum: number = 0,
  lumpSumMonth: number = 0,
  monthsAlreadyPaid: number = 0
): PayoffResult {
  const monthlyRate = annualRate / 100 / 12;
  
  // Calculate standard monthly payment
  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = balance / Math.max(termMonths - monthsAlreadyPaid, 1);
  } else {
    // Payment based on remaining term
    const remainingTerm = Math.max(termMonths - monthsAlreadyPaid, 1);
    monthlyPayment = (balance * monthlyRate * Math.pow(1 + monthlyRate, remainingTerm)) /
      (Math.pow(1 + monthlyRate, remainingTerm) - 1);
  }

  // Biweekly effectively adds ~1 extra payment per year
  const biweeklyExtra = biweekly ? monthlyPayment / 12 : 0;
  const totalExtra = extraMonthly + biweeklyExtra;

  const schedule: AmortizationEntry[] = [];
  let remaining = balance;
  let totalInterestPaid = 0;
  let totalPaid = 0;
  let month = 0;

  while (remaining > 0.01 && month < 600) { // max 50 years safety
    month++;
    const interestCharge = remaining * monthlyRate;
    let principalPayment = monthlyPayment - interestCharge;
    let extra = totalExtra;

    // Apply lump sum
    if (lumpSumMonth > 0 && month === lumpSumMonth) {
      extra += lumpSum;
    }

    // Make sure we don't overpay
    const totalPayment = Math.min(monthlyPayment + extra, remaining + interestCharge);
    principalPayment = totalPayment - interestCharge;
    extra = Math.max(0, principalPayment - (monthlyPayment - interestCharge));

    remaining = Math.max(0, remaining - principalPayment);
    totalInterestPaid += interestCharge;
    totalPaid += totalPayment;

    schedule.push({
      month,
      payment: totalPayment,
      principal: principalPayment - extra,
      interest: interestCharge,
      extraPrincipal: extra,
      balance: remaining,
    });
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  return {
    monthlyPayment,
    totalPayments: totalPaid,
    totalInterest: totalInterestPaid,
    payoffMonths: month,
    payoffDate,
    schedule,
  };
}

export function EarlyPayoffCalculator() {
  const [debtType, setDebtType] = useState<DebtType>("mortgage");
  const [balance, setBalance] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termYears, setTermYears] = useState("");
  const [monthsIntoPlan, setMonthsIntoPlan] = useState("");
  const [currentPayment, setCurrentPayment] = useState("");
  const [extraMonthly, setExtraMonthly] = useState("");
  const [biweekly, setBiweekly] = useState(false);
  const [lumpSum, setLumpSum] = useState("");
  const [lumpSumMonth, setLumpSumMonth] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeScenarioTab, setActiveScenarioTab] = useState("results");

  const config = DEBT_TYPE_CONFIG[debtType];
  const Icon = config.icon;

  const isValid = parseFloat(balance) > 0 && parseFloat(interestRate) >= 0 && 
    (debtType === "credit_card" ? parseFloat(currentPayment) > 0 : parseFloat(termYears) > 0);

  // Base result (no extras)
  const baseResult = useMemo(() => {
    if (!isValid) return null;
    const bal = parseFloat(balance);
    const rate = parseFloat(interestRate);
    const term = debtType === "credit_card" ? 0 : parseFloat(termYears) * 12;
    const months = parseInt(monthsIntoPlan) || 0;

    if (debtType === "credit_card") {
      // For credit cards, use current payment to calculate payoff
      const pmt = parseFloat(currentPayment) || 0;
      if (pmt <= 0) return null;
      const monthlyRate = rate / 100 / 12;
      const schedule: AmortizationEntry[] = [];
      let remaining = bal;
      let totalInterest = 0;
      let totalPaid = 0;
      let month = 0;

      while (remaining > 0.01 && month < 600) {
        month++;
        const interest = remaining * monthlyRate;
        const payment = Math.min(pmt, remaining + interest);
        const principal = payment - interest;
        remaining = Math.max(0, remaining - principal);
        totalInterest += interest;
        totalPaid += payment;
        schedule.push({ month, payment, principal, interest, extraPrincipal: 0, balance: remaining });
      }

      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month);
      return { monthlyPayment: pmt, totalPayments: totalPaid, totalInterest, payoffMonths: month, payoffDate, schedule };
    }

    return calculateAmortization(bal, rate, term, 0, false, 0, 0, months);
  }, [balance, interestRate, termYears, monthsIntoPlan, currentPayment, debtType, isValid]);

  // Accelerated result (with extras)
  const acceleratedResult = useMemo(() => {
    if (!isValid) return null;
    const bal = parseFloat(balance);
    const rate = parseFloat(interestRate);
    const term = debtType === "credit_card" ? 0 : parseFloat(termYears) * 12;
    const months = parseInt(monthsIntoPlan) || 0;
    const extra = parseFloat(extraMonthly) || 0;
    const lump = parseFloat(lumpSum) || 0;
    const lumpMo = parseInt(lumpSumMonth) || 0;

    if (debtType === "credit_card") {
      const pmt = parseFloat(currentPayment) || 0;
      if (pmt <= 0) return null;
      const monthlyRate = rate / 100 / 12;
      const biweeklyExtra = biweekly ? pmt / 12 : 0;
      const totalExtra = extra + biweeklyExtra;
      const schedule: AmortizationEntry[] = [];
      let remaining = bal;
      let totalInterest = 0;
      let totalPaid = 0;
      let month = 0;

      while (remaining > 0.01 && month < 600) {
        month++;
        const interest = remaining * monthlyRate;
        let ex = totalExtra;
        if (lumpMo > 0 && month === lumpMo) ex += lump;
        const payment = Math.min(pmt + ex, remaining + interest);
        const principal = payment - interest;
        remaining = Math.max(0, remaining - principal);
        totalInterest += interest;
        totalPaid += payment;
        schedule.push({ month, payment, principal, interest, extraPrincipal: Math.min(ex, principal), balance: remaining });
      }

      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month);
      return { monthlyPayment: pmt, totalPayments: totalPaid, totalInterest, payoffMonths: month, payoffDate, schedule };
    }

    return calculateAmortization(bal, rate, term, extra, biweekly, lump, lumpMo, months);
  }, [balance, interestRate, termYears, monthsIntoPlan, extraMonthly, biweekly, lumpSum, lumpSumMonth, currentPayment, debtType, isValid]);

  // Scenarios comparison
  const scenarios = useMemo((): ScenarioResult[] => {
    if (!baseResult || !isValid) return [];
    const bal = parseFloat(balance);
    const rate = parseFloat(interestRate);
    const term = debtType === "credit_card" ? 0 : parseFloat(termYears) * 12;
    const months = parseInt(monthsIntoPlan) || 0;
    const pmt = parseFloat(currentPayment) || 0;

    const makeScenario = (label: string, extra: number, bw: boolean, ls: number, lsm: number): ScenarioResult => {
      let result: PayoffResult;
      if (debtType === "credit_card") {
        const monthlyRate = rate / 100 / 12;
        const biweeklyExtra = bw ? pmt / 12 : 0;
        const totalExtra = extra + biweeklyExtra;
        let remaining = bal;
        let totalInterest = 0;
        let totalPaid = 0;
        let month = 0;
        while (remaining > 0.01 && month < 600) {
          month++;
          const interest = remaining * monthlyRate;
          let ex = totalExtra;
          if (lsm > 0 && month === lsm) ex += ls;
          const payment = Math.min(pmt + ex, remaining + interest);
          remaining = Math.max(0, remaining - (payment - interest));
          totalInterest += interest;
          totalPaid += payment;
        }
        result = { monthlyPayment: pmt, totalPayments: totalPaid, totalInterest, payoffMonths: month, payoffDate: new Date(), schedule: [] };
      } else {
        result = calculateAmortization(bal, rate, term, extra, bw, ls, lsm, months);
      }
      return {
        label,
        payoffMonths: result.payoffMonths,
        totalInterest: result.totalInterest,
        totalPayments: result.totalPayments,
        monthsSaved: baseResult.payoffMonths - result.payoffMonths,
        interestSaved: baseResult.totalInterest - result.totalInterest,
      };
    };

    const results: ScenarioResult[] = [
      makeScenario("Current Plan", 0, false, 0, 0),
      makeScenario("+$100/mo extra", 100, false, 0, 0),
      makeScenario("+$250/mo extra", 250, false, 0, 0),
      makeScenario("+$500/mo extra", 500, false, 0, 0),
      makeScenario("Biweekly payments", 0, true, 0, 0),
    ];

    if (debtType === "mortgage") {
      results.push(makeScenario("Biweekly + $200/mo", 200, true, 0, 0));
    }

    return results;
  }, [baseResult, balance, interestRate, termYears, monthsIntoPlan, currentPayment, debtType, isValid]);

  const formatMoney = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatMonths = (m: number) => {
    const y = Math.floor(m / 12);
    const mo = m % 12;
    if (y === 0) return `${mo} mo`;
    if (mo === 0) return `${y} yr`;
    return `${y} yr ${mo} mo`;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Early Payoff Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how extra payments, biweekly schedules, or lump sums can save you time and money
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Debt Type Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {(Object.entries(DEBT_TYPE_CONFIG) as [DebtType, typeof DEBT_TYPE_CONFIG["mortgage"]][]).map(([key, cfg]) => {
            const TypeIcon = cfg.icon;
            return (
              <button
                key={key}
                onClick={() => setDebtType(key)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all",
                  debtType === key
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card hover:border-primary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <TypeIcon className="h-4 w-4" />
                <span className="text-[10px] sm:text-xs leading-tight text-center">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loan Details */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Icon className={cn("h-4 w-4", config.color)} />
            {config.label} Details
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Current Balance</Label>
              <Input
                type="number"
                placeholder="e.g. 250000"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 6.5"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="mt-1"
              />
            </div>

            {debtType !== "credit_card" ? (
              <>
                <div>
                  <Label className="text-xs">Original Term (years)</Label>
                  <Input
                    type="number"
                    placeholder={debtType === "mortgage" ? "30" : "5"}
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Months Already Paid</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 120"
                    value={monthsIntoPlan}
                    onChange={(e) => setMonthsIntoPlan(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <Label className="text-xs">Monthly Payment</Label>
                <Input
                  type="number"
                  placeholder="e.g. 200"
                  value={currentPayment}
                  onChange={(e) => setCurrentPayment(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Acceleration Options */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Acceleration Options
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Extra Monthly Payment</Label>
              <Input
                type="number"
                placeholder="e.g. 200"
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={biweekly} onCheckedChange={setBiweekly} />
                <Label className="text-xs cursor-pointer">Biweekly Payments</Label>
              </div>
            </div>
            <div>
              <Label className="text-xs">One-Time Lump Sum</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={lumpSum}
                onChange={(e) => setLumpSum(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Apply in Month #</Label>
              <Input
                type="number"
                placeholder="e.g. 6"
                value={lumpSumMonth}
                onChange={(e) => setLumpSumMonth(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        {isValid && baseResult && acceleratedResult && (
          <div className="space-y-4">
            <Tabs value={activeScenarioTab} onValueChange={setActiveScenarioTab}>
              <TabsList className="w-full">
                <TabsTrigger value="results" className="flex-1 text-xs">Your Results</TabsTrigger>
                <TabsTrigger value="scenarios" className="flex-1 text-xs">Scenarios</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1 text-xs">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="results" className="mt-3 space-y-4">
                {/* Side by side comparison */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Current */}
                  <div className="p-3 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Current Plan
                    </div>
                    <div className="text-xl font-bold">{formatMonths(baseResult.payoffMonths)}</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Monthly</span>
                        <span className="font-medium text-foreground">{formatMoney(baseResult.monthlyPayment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Interest</span>
                        <span className="font-medium text-destructive">{formatMoney(baseResult.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Paid</span>
                        <span className="font-medium text-foreground">{formatMoney(baseResult.totalPayments)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Accelerated */}
                  <div className="p-3 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex items-center gap-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3 w-3" />
                      Accelerated
                    </div>
                    <div className="text-xl font-bold text-primary">{formatMonths(acceleratedResult.payoffMonths)}</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Monthly</span>
                        <span className="font-medium text-foreground">
                          {formatMoney(acceleratedResult.monthlyPayment + (parseFloat(extraMonthly) || 0) + (biweekly ? acceleratedResult.monthlyPayment / 12 : 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Interest</span>
                        <span className="font-medium text-emerald-600">{formatMoney(acceleratedResult.totalInterest)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Paid</span>
                        <span className="font-medium text-foreground">{formatMoney(acceleratedResult.totalPayments)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Summary */}
                {(baseResult.payoffMonths !== acceleratedResult.payoffMonths || baseResult.totalInterest !== acceleratedResult.totalInterest) && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Your Savings
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMonths(baseResult.payoffMonths - acceleratedResult.payoffMonths)}
                        </div>
                        <p className="text-xs text-muted-foreground">Time saved</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(baseResult.totalInterest - acceleratedResult.totalInterest)}
                        </div>
                        <p className="text-xs text-muted-foreground">Interest saved</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pay off by <span className="font-medium text-foreground">
                        {acceleratedResult.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span> instead of{" "}
                      <span className="font-medium text-foreground">
                        {baseResult.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scenarios" className="mt-3">
                <div className="space-y-2">
                  {scenarios.map((s, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-sm",
                        i === 0 ? "bg-muted/50" : "bg-card"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm">{s.label}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Payoff: {formatMonths(s.payoffMonths)} · Interest: {formatMoney(s.totalInterest)}
                        </p>
                      </div>
                      {s.monthsSaved > 0 && (
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Save {formatMonths(s.monthsSaved)}
                          </p>
                          <p className="text-[10px] text-emerald-600/70">
                            {formatMoney(s.interestSaved)} less interest
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="mt-3">
                <div className="max-h-[300px] overflow-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="p-2 text-left font-medium">Mo</th>
                        <th className="p-2 text-right font-medium">Payment</th>
                        <th className="p-2 text-right font-medium">Principal</th>
                        <th className="p-2 text-right font-medium">Interest</th>
                        <th className="p-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceleratedResult.schedule.map((entry) => (
                        <tr key={entry.month} className="border-t">
                          <td className="p-2">{entry.month}</td>
                          <td className="p-2 text-right">{formatMoney(entry.payment)}</td>
                          <td className="p-2 text-right text-emerald-600">
                            {formatMoney(entry.principal + entry.extraPrincipal)}
                          </td>
                          <td className="p-2 text-right text-destructive">{formatMoney(entry.interest)}</td>
                          <td className="p-2 text-right font-medium">{formatMoney(entry.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {acceleratedResult.schedule.length} payments shown · Scroll to see full schedule
                </p>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!isValid && (
          <div className="text-center py-6 text-muted-foreground">
            <Calculator className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Enter your loan details above to see payoff scenarios</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
