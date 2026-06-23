import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp, Home, Wallet, Shield, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CalculatorType = "compound" | "loan" | "retire" | "emergency";

interface ToolsTabProps {
  searchQuery?: string;
}

export const ToolsTab = ({ searchQuery }: ToolsTabProps) => {
  const [activeCalculator, setActiveCalculator] = useState<CalculatorType>("compound");

  const calculators = [
    { id: "compound" as const, label: "Compound", icon: TrendingUp },
    { id: "loan" as const, label: "Loan", icon: Home },
    { id: "retire" as const, label: "Retire", icon: Wallet },
    { id: "emergency" as const, label: "Emergency", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Strategic Labs — Financial Calculators</CardTitle>
                <p className="text-muted-foreground text-sm mt-1">
                  Heavy-machinery math behind your Strategic Blueprints. Bloom uses these under the hood; you can run them directly here.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <History className="w-4 h-4" />
              History
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calculator Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          const isActive = activeCalculator === calc.id;
          
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalculator(calc.id)}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{calc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Calculator Content */}
      {activeCalculator === "compound" && <CompoundInterestCalculator />}
      {activeCalculator === "loan" && <LoanCalculator />}
      {activeCalculator === "retire" && <RetirementCalculator />}
      {activeCalculator === "emergency" && <EmergencyFundCalculator />}
    </div>
  );
};

const CompoundInterestCalculator = () => {
  const [principal, setPrincipal] = useState(1000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(10);
  const [monthlyContribution, setMonthlyContribution] = useState(100);

  const calculateCompoundInterest = () => {
    const r = rate / 100;
    const n = 12; // compound monthly
    const t = years;
    
    // Future value of initial principal
    const principalFV = principal * Math.pow(1 + r/n, n*t);
    
    // Future value of monthly contributions
    const contributionFV = monthlyContribution * ((Math.pow(1 + r/n, n*t) - 1) / (r/n));
    
    return principalFV + contributionFV;
  };

  const futureValue = calculateCompoundInterest();
  const totalContributed = principal + (monthlyContribution * 12 * years);
  const interestEarned = futureValue - totalContributed;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-bloom-green" />
          Compound Interest Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          See how your money grows over time with compound interest
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="principal">Initial Investment ($)</Label>
          <Input
            id="principal"
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate">Annual Interest Rate (%)</Label>
          <Input
            id="rate"
            type="number"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="years">Time Period (Years)</Label>
          <Input
            id="years"
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthly">Monthly Contribution ($)</Label>
          <Input
            id="monthly"
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
          />
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-bloom-green/10 to-primary/10 rounded-xl">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Future Value</p>
            <p className="text-3xl font-bold text-foreground">
              ${futureValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Contributed</p>
              <p className="text-lg font-semibold text-foreground">
                ${totalContributed.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Interest Earned</p>
              <p className="text-lg font-semibold text-bloom-green">
                ${interestEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LoanCalculator = () => {
  const [loanAmount, setLoanAmount] = useState(250000);
  const [interestRate, setInterestRate] = useState(6.5);
  const [loanTerm, setLoanTerm] = useState(30);

  const calculateMonthlyPayment = () => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    if (monthlyRate === 0) return principal / numberOfPayments;
    
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  };

  const monthlyPayment = calculateMonthlyPayment();
  const totalPayment = monthlyPayment * loanTerm * 12;
  const totalInterest = totalPayment - loanAmount;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="w-5 h-5 text-bloom-blue" />
          Loan Payment Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate your monthly loan payments
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="loanAmount">Loan Amount ($)</Label>
          <Input
            id="loanAmount"
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interestRate">Interest Rate (%)</Label>
          <Input
            id="interestRate"
            type="number"
            step="0.1"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loanTerm">Loan Term (Years)</Label>
          <Input
            id="loanTerm"
            type="number"
            value={loanTerm}
            onChange={(e) => setLoanTerm(Number(e.target.value))}
          />
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-bloom-blue/10 to-primary/10 rounded-xl">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Monthly Payment</p>
            <p className="text-3xl font-bold text-foreground">
              ${monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Payment</p>
              <p className="text-lg font-semibold text-foreground">
                ${totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Interest</p>
              <p className="text-lg font-semibold text-destructive">
                ${totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const RetirementCalculator = () => {
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(50000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [expectedReturn, setExpectedReturn] = useState(7);

  const calculateRetirementSavings = () => {
    const years = retirementAge - currentAge;
    const r = expectedReturn / 100;
    const n = 12;
    
    const principalFV = currentSavings * Math.pow(1 + r/n, n*years);
    const contributionFV = monthlyContribution * ((Math.pow(1 + r/n, n*years) - 1) / (r/n));
    
    return principalFV + contributionFV;
  };

  const retirementSavings = calculateRetirementSavings();
  const yearsToRetirement = retirementAge - currentAge;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5 text-primary" />
          Retirement Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Plan for your retirement savings
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentAge">Current Age</Label>
            <Input
              id="currentAge"
              type="number"
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retirementAge">Retirement Age</Label>
            <Input
              id="retirementAge"
              type="number"
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentSavings">Current Retirement Savings ($)</Label>
          <Input
            id="currentSavings"
            type="number"
            value={currentSavings}
            onChange={(e) => setCurrentSavings(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyRetirement">Monthly Contribution ($)</Label>
          <Input
            id="monthlyRetirement"
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedReturn">Expected Annual Return (%)</Label>
          <Input
            id="expectedReturn"
            type="number"
            step="0.1"
            value={expectedReturn}
            onChange={(e) => setExpectedReturn(Number(e.target.value))}
          />
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Estimated Retirement Savings</p>
            <p className="text-3xl font-bold text-foreground">
              ${retirementSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              In {yearsToRetirement} years at age {retirementAge}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmergencyFundCalculator = () => {
  const [monthlyExpenses, setMonthlyExpenses] = useState(4000);
  const [monthsCovered, setMonthsCovered] = useState(6);
  const [currentSavings, setCurrentSavings] = useState(5000);

  const targetEmergencyFund = monthlyExpenses * monthsCovered;
  const amountNeeded = Math.max(0, targetEmergencyFund - currentSavings);
  const percentComplete = Math.min(100, (currentSavings / targetEmergencyFund) * 100);

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-bloom-green" />
          Emergency Fund Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Build your financial safety net
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
          <Input
            id="monthlyExpenses"
            type="number"
            value={monthlyExpenses}
            onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthsCovered">Months to Cover</Label>
          <Input
            id="monthsCovered"
            type="number"
            value={monthsCovered}
            onChange={(e) => setMonthsCovered(Number(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Financial experts recommend 3-6 months of expenses
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencySavings">Current Emergency Savings ($)</Label>
          <Input
            id="emergencySavings"
            type="number"
            value={currentSavings}
            onChange={(e) => setCurrentSavings(Number(e.target.value))}
          />
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-bloom-green/10 to-primary/10 rounded-xl space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Target Emergency Fund</p>
            <p className="text-3xl font-bold text-foreground">
              ${targetEmergencyFund.toLocaleString()}
            </p>
          </div>

          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-bloom-green h-3 rounded-full transition-all"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {percentComplete.toFixed(0)}% complete
          </p>

          {amountNeeded > 0 && (
            <div className="text-center pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">Amount Still Needed</p>
              <p className="text-xl font-semibold text-foreground">
                ${amountNeeded.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
