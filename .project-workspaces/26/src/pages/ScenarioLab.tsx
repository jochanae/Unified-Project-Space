import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, FlaskConical, DollarSign, BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const PRESET_CATEGORIES = [
  "HVAC / Climate System",
  "Solar Panel Installation",
  "Vehicle Purchase",
  "Home Renovation",
  "Appliance Upgrade",
  "Business Equipment",
  "Energy Efficiency Retrofit",
  "Custom",
];

export default function ScenarioLab() {
  const navigate = useNavigate();

  // Inputs
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [upgradeCost, setUpgradeCost] = useState("");
  const [currentMonthly, setCurrentMonthly] = useState("");
  const [projectedMonthly, setProjectedMonthly] = useState("");
  const [brokerageReturn, setBrokerageReturn] = useState(8);
  const cost = Number(upgradeCost) || 0;
  const current = Number(currentMonthly) || 0;
  const projected = Number(projectedMonthly) || 0;
  const monthlySavings = current - projected;

  const displayCategory = category === "Custom" ? customCategory : category;

  const canCalculate = cost > 0 && current > 0 && projected >= 0 && monthlySavings > 0 && (category !== "" && (category !== "Custom" || customCategory.trim()));

  const handleCalculate = () => {
    if (!canCalculate) {
      toast.error("Please fill in all fields. Monthly savings must be positive.");
      return;
    }
    navigate("/scenario-lab/results", {
      state: {
        category: displayCategory,
        upgradeCost: cost,
        currentMonthly: current,
        projectedMonthly: projected,
        brokerageReturn,
      },
    });
  };
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[hsl(260,10%,94%)] via-background to-background dark:from-[hsl(260,15%,10%)] dark:via-background dark:to-background pb-24">
      <Helmet>
        <title>Scenario Lab | CoinsBloom</title>
        <meta name="description" content="Run cost-benefit analyses on major financial decisions." />
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-emerald-500" />
            <h1 className="text-lg font-bold tracking-tight">Scenario Lab</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Input Card */}
        <Card className="border border-border/60 bg-card/80 backdrop-blur-md shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Define the Scenario
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Input a major expense to see break-even, ROI, and opportunity cost.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Expense Category</Label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none"
                >
                  <option value="">Select a category...</option>
                  {PRESET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {category === "Custom" && (
                <Input
                  placeholder="e.g. Pool Installation"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Cost of Upgrade */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Cost of Upgrade</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="12000"
                  value={upgradeCost}
                  onChange={(e) => setUpgradeCost(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Current Monthly Cost */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Monthly Cost</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="900"
                  value={currentMonthly}
                  onChange={(e) => setCurrentMonthly(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Projected Monthly Cost */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Projected Monthly Cost (After Upgrade)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="400"
                  value={projectedMonthly}
                  onChange={(e) => setProjectedMonthly(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Brokerage Return */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Expected Investment Return (Annual)</Label>
                <span className="text-sm font-semibold text-emerald-600 px-2 py-0.5 bg-emerald-500/10 rounded-full">
                  {brokerageReturn}%
                </span>
              </div>
              <Slider
                value={[brokerageReturn]}
                onValueChange={(v) => setBrokerageReturn(v[0])}
                min={2}
                max={15}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2% (Conservative)</span>
                <span>15% (Aggressive)</span>
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Run Analysis
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
