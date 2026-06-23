import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Plus, Trash2 } from "lucide-react";

interface DebtEntry {
  id: string;
  name: string;
  amount: number;
}

export function DTICalculator() {
  const [income, setIncome] = useState<string>("");
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([
    { id: "1", name: "Mortgage/Rent", amount: 0 },
    { id: "2", name: "Car Payment", amount: 0 },
  ]);

  const totalIncome = parseFloat(income) || 0;
  const totalDebt = debtEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const dtiRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;

  const addDebtEntry = () => {
    setDebtEntries([
      ...debtEntries,
      { id: Date.now().toString(), name: "New Debt", amount: 0 },
    ]);
  };

  const removeDebtEntry = (id: string) => {
    setDebtEntries(debtEntries.filter((entry) => entry.id !== id));
  };

  const updateDebtEntry = (id: string, field: "name" | "amount", value: string | number) => {
    setDebtEntries(
      debtEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const getDTIStatus = () => {
    if (dtiRatio <= 28) return { color: "text-green-600", status: "Excellent - Easily qualify for most loans" };
    if (dtiRatio <= 36) return { color: "text-green-500", status: "Good - Should qualify for conventional mortgages" };
    if (dtiRatio <= 43) return { color: "text-yellow-600", status: "Fair - May qualify with FHA loans" };
    return { color: "text-destructive", status: "High - Consider reducing debt before applying" };
  };

  const dtiStatus = getDTIStatus();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Debt-to-Income Calculator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate your DTI ratio to see if you qualify for loans and mortgages
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Income Input */}
        <div className="space-y-2">
          <Label className="font-semibold">Gross Monthly Income</Label>
          <Input
            type="number"
            placeholder="Enter your total monthly income"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Include all income sources before taxes
          </p>
        </div>

        {/* Debt Entries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Monthly Debt Payments</Label>
            <Button variant="outline" size="sm" onClick={addDebtEntry}>
              <Plus className="h-4 w-4 mr-1" />
              Add Debt
            </Button>
          </div>

          {debtEntries.map((entry) => (
            <div key={entry.id} className="flex gap-2 items-center">
              <Input
                placeholder="Debt name"
                value={entry.name}
                onChange={(e) => updateDebtEntry(entry.id, "name", e.target.value)}
                className="flex-1"
              />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={entry.amount || ""}
                  onChange={(e) => updateDebtEntry(entry.id, "amount", parseFloat(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => removeDebtEntry(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-xl font-bold">${totalIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Debt Payments</p>
            <p className="text-xl font-bold">${totalDebt.toLocaleString()}</p>
          </div>
        </div>

        {/* DTI Result */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Your DTI Ratio</span>
            {totalIncome === 0 && totalDebt === 0 && (
              <span className="text-sm text-muted-foreground">Enter data to calculate</span>
            )}
          </div>
          <p className={`text-5xl font-bold ${dtiStatus.color}`}>
            {dtiRatio.toFixed(1)}%
          </p>
        </div>

        {/* DTI Guidelines */}
        <div className="space-y-2">
          <h4 className="font-semibold">DTI Guidelines:</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></span>
              <span><strong>0-28%:</strong> Excellent - Easily qualify for most loans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></span>
              <span><strong>29-36%:</strong> Good - Should qualify for conventional mortgages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0"></span>
              <span><strong>37-43%:</strong> Fair - May qualify with FHA loans</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 flex-shrink-0"></span>
              <span><strong>44%+:</strong> High - Consider reducing debt before applying</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
