import { useState } from "react";
import { Info, Plus, Trash2, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DebtItem {
  id: string;
  name: string;
  amount: number;
}

export const DTITab = () => {
  const [income, setIncome] = useState<number>(0);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [debts, setDebts] = useState<DebtItem[]>([
    { id: "1", name: "Mortgage/Rent", amount: 0 },
    { id: "2", name: "Car Payment", amount: 0 },
  ]);

  const totalDebts = debts.reduce((sum, d) => sum + d.amount, 0);
  const dtiRatio = income > 0 ? (totalDebts / income) * 100 : 0;

  const getDTIStatus = (ratio: number) => {
    if (ratio <= 20) return { label: "Excellent", color: "text-green-600", bg: "bg-green-100" };
    if (ratio <= 35) return { label: "Good", color: "text-blue-600", bg: "bg-blue-100" };
    if (ratio <= 43) return { label: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "High Risk", color: "text-red-600", bg: "bg-red-100" };
  };

  const status = getDTIStatus(dtiRatio);

  const addDebt = () => {
    setDebts([...debts, { id: Date.now().toString(), name: "", amount: 0 }]);
  };

  const removeDebt = (id: string) => {
    setDebts(debts.filter((d) => d.id !== id));
  };

  const updateDebt = (id: string, field: "name" | "amount", value: string | number) => {
    setDebts(debts.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  return (
    <div className="space-y-4">
      <Collapsible open={formulaOpen} onOpenChange={setFormulaOpen}>
        <Card className="border-2 border-blue-200 bg-blue-50/30">
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <p className="text-sm font-medium text-primary text-left">DTI Formula & Example</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${formulaOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="pl-7">
                <p className="text-sm">
                  DTI Ratio = (Total Monthly Debt Payments ÷ Gross Monthly Income) × 100
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Example: $2,000 debt payments ÷ $6,000 income × 100 = 33.3% DTI
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-xl text-primary">Debt-to-Income Calculator</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Calculate your DTI ratio to see if you qualify for loans and mortgages
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="font-semibold">Gross Monthly Income</Label>
            <Input
              type="number"
              placeholder="Enter your total monthly income"
              value={income || ""}
              onChange={(e) => setIncome(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Include all income sources before taxes</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="font-semibold">Monthly Debt Payments</Label>
              <Button variant="outline" size="sm" onClick={addDebt}>
                <Plus className="h-4 w-4 mr-1" /> Add Debt
              </Button>
            </div>
            <div className="space-y-2">
              {debts.map((debt) => (
                <div key={debt.id} className="flex gap-2 items-center">
                  <Input
                    placeholder="Debt name"
                    value={debt.name}
                    onChange={(e) => updateDebt(debt.id, "name", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="$0"
                    value={debt.amount || ""}
                    onChange={(e) => updateDebt(debt.id, "amount", Number(e.target.value))}
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeDebt(debt.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Income</p>
              <p className="text-xl font-bold">${income.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Debt Payments</p>
              <p className="text-xl font-bold">${totalDebts.toLocaleString()}</p>
            </div>
          </div>

          <Card className={`${status.bg} border-0`}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Your DTI Ratio</p>
              <p className={`text-4xl font-bold ${status.color}`}>{dtiRatio.toFixed(1)}%</p>
              <p className={`text-sm font-medium mt-1 ${status.color}`}>{status.label}</p>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Under 20%:</strong> Excellent - More room for savings and investments</p>
            <p>• <strong>20-35%:</strong> Good - Comfortable debt level for most lenders</p>
            <p>• <strong>36-43%:</strong> Fair - May affect loan approval; consider reducing debt</p>
            <p>• <strong>Over 43%:</strong> High - Most lenders won't approve new loans</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
