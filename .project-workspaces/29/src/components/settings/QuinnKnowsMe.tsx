import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useQuinnContext, type QuinnContext, type RiskProfile } from "@/hooks/useQuinnContext";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Save,
  Sparkles,
  Shield,
  Wallet,
  TrendingUp,
  BookOpen,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BROKERAGES = [
  "Fidelity", "Charles Schwab", "Vanguard", "Robinhood", "E*TRADE",
  "thinkorswim (Schwab)", "Interactive Brokers", "Webull", "Merrill Edge", "Other",
];

const ACCOUNT_TYPES = [
  "401(k)", "Roth IRA", "Traditional IRA", "Taxable Brokerage", "HSA",
  "529 Plan", "SEP IRA", "Solo 401(k)", "Pension", "Other",
];

const ASSET_CLASSES = [
  "Stocks", "ETFs", "Options", "Crypto", "Bonds", "Mutual Funds",
  "Forex", "Futures", "Commodities", "REITs", "Life Insurance (IUL, Whole Life)", "Annuities",
];

const LEARNING_TOPICS = [
  "Technical Analysis", "Fundamental Analysis", "Options Trading", "Day Trading",
  "Swing Trading", "Long-term Investing", "Risk Management", "Tax Strategies",
  "Retirement Planning", "Dividend Investing", "Growth Investing", "Value Investing",
];

// ─────────────────────────────────────────────────────────────────────────────
// Tooltip helper
// ─────────────────────────────────────────────────────────────────────────────

interface FieldTooltipProps {
  children: React.ReactNode;
  tip: string;
  example?: string;
}

function FieldTooltip({ children, tip, example }: FieldTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            {children}
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{tip}</p>
          {example && <p className="text-muted-foreground text-xs mt-1">Example: {example}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section wrapper
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-muted/50">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function QuinnKnowsMe() {
  const {
    context,
    isLoading,
    isSaving,
    updateContext,
    markAsReviewed,
    getProfileCompleteness,
    getDetailsCompleteness,
    needsReview,
    refetch,
  } = useQuinnContext();

  // Local form state – initialised from context once loaded
  const [form, setForm] = useState<Partial<QuinnContext>>({});
  const [dirty, setDirty] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Sync form whenever backend context changes (initial load / refetch)
  useEffect(() => {
    if (context) {
      setForm({
        preferred_name: context.preferred_name,
        primary_goal: context.primary_goal,
        experience_level: context.experience_level,
        emergency_fund_status: context.emergency_fund_status,
        debt_situation: context.debt_situation,
        income_type: context.income_type,
        brokerages: context.brokerages,
        account_types: context.account_types,
        risk_profile: context.risk_profile,
        interested_assets: context.interested_assets,
        communication_style: context.communication_style,
        learning_topics: context.learning_topics,
      });
      setDirty(false);
    }
  }, [context]);

  // ─────────────────────────────────────────────────────────────────────────
  // Form handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleChange = <K extends keyof QuinnContext>(field: K, value: QuinnContext[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
    setJustSaved(false);
  };

  const toggleArrayItem = (
    field: "brokerages" | "account_types" | "interested_assets" | "learning_topics",
    item: string,
  ) => {
    const current = (form[field] as string[]) ?? [];
    const updated = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
    handleChange(field, updated);
  };

  const handleRiskChange = (type: keyof RiskProfile, value: number) => {
    const current: RiskProfile = (form.risk_profile as RiskProfile) ?? { stable: 0, growth: 0, active: 0 };
    handleChange("risk_profile", { ...current, [type]: value });
  };

  const handleSave = async () => {
    const success = await updateContext(form);
    if (success) {
      setDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────

  const mergedContext = { ...(context ?? {}), ...form } as QuinnContext;
  const coreCompleteness = getProfileCompleteness(mergedContext);
  const detailsCompleteness = getDetailsCompleteness(mergedContext);
  const shouldOpenSections = coreCompleteness < 80;
  const showReviewPrompt = needsReview() && context?.last_reviewed_at;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Quinn Knows Me
                <Sparkles className="h-4 w-4 text-primary" />
              </CardTitle>
              <CardDescription>Help Quinn give you personalized guidance</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {justSaved && (
              <Badge variant="outline" className="text-gain border-gain bg-gain/10 animate-pulse">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Saved!
              </Badge>
            )}
            {dirty && (
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bars */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Core profile completeness</span>
            <span className="font-medium">{coreCompleteness}%</span>
          </div>
          <Progress value={coreCompleteness} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Optional details</span>
            <span>{detailsCompleteness}%</span>
          </div>
        </div>

        {/* Review prompt */}
        {showReviewPrompt && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-warning">Time for a review!</p>
              <p className="text-muted-foreground">
                Last reviewed {formatDistanceToNow(new Date(context!.last_reviewed_at!))} ago
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={markAsReviewed}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark Reviewed
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 divide-y">
        {/* The Basics */}
        <Section title="The Basics" icon={<Sparkles className="h-4 w-4 text-primary" />} defaultOpen={shouldOpenSections}>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldTooltip tip="What should Quinn call you?" example="Jay, Dr. Smith, Coach">
                <Label>Preferred Name</Label>
              </FieldTooltip>
              <Input
                placeholder="What should Quinn call you?"
                value={form.preferred_name ?? ""}
                onChange={(e) => handleChange("preferred_name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Your main financial priority right now" example="Save for a house, Learn day trading">
                <Label>Primary Goal</Label>
              </FieldTooltip>
              <Input
                placeholder="What's your #1 financial goal right now?"
                value={form.primary_goal ?? ""}
                onChange={(e) => handleChange("primary_goal", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Your investing and trading experience level">
                <Label>Experience Level</Label>
              </FieldTooltip>
              <Select
                value={form.experience_level ?? ""}
                onValueChange={(v) => handleChange("experience_level", v as QuinnContext["experience_level"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How would you describe your experience?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner - Just getting started</SelectItem>
                  <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                  <SelectItem value="advanced">Advanced - Experienced investor/trader</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* Financial Foundation */}
        <Section title="My Financial Foundation" icon={<Shield className="h-4 w-4 text-gain" />} defaultOpen={shouldOpenSections}>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldTooltip tip="3-6 months of expenses in savings" example="Helps Quinn prioritise savings vs investing">
                <Label>Emergency Fund Status</Label>
              </FieldTooltip>
              <Select
                value={form.emergency_fund_status ?? ""}
                onValueChange={(v) => handleChange("emergency_fund_status", v as QuinnContext["emergency_fund_status"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your emergency fund status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None yet</SelectItem>
                  <SelectItem value="building">Building (less than 3 months)</SelectItem>
                  <SelectItem value="partial">Partial (3-5 months)</SelectItem>
                  <SelectItem value="complete">Complete (6+ months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="High-interest debt affects investment priorities">
                <Label>Debt Situation</Label>
              </FieldTooltip>
              <Select
                value={form.debt_situation ?? ""}
                onValueChange={(v) => handleChange("debt_situation", v as QuinnContext["debt_situation"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your debt situation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No debt</SelectItem>
                  <SelectItem value="low_interest">Low-interest only (mortgage, student loans)</SelectItem>
                  <SelectItem value="high_interest">High-interest debt (credit cards, etc.)</SelectItem>
                  <SelectItem value="mixed">Mix of both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Affects how much you can safely invest">
                <Label>Income Type</Label>
              </FieldTooltip>
              <Select
                value={form.income_type ?? ""}
                onValueChange={(v) => handleChange("income_type", v as QuinnContext["income_type"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How stable is your income?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable (W-2, salary)</SelectItem>
                  <SelectItem value="variable">Variable (freelance, gig work)</SelectItem>
                  <SelectItem value="mixed">Mixed sources</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        {/* My Accounts */}
        <Section title="My Accounts" icon={<Wallet className="h-4 w-4 text-secondary" />} defaultOpen={shouldOpenSections}>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldTooltip tip="Your brokerage platforms" example="Quinn can give platform-specific instructions">
                <Label>Brokerages I Use</Label>
              </FieldTooltip>
              <div className="flex flex-wrap gap-2">
                {BROKERAGES.map((brokerage) => (
                  <Badge
                    key={brokerage}
                    variant={(form.brokerages ?? []).includes(brokerage) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArrayItem("brokerages", brokerage)}
                  >
                    {brokerage}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Types of investment accounts you have">
                <Label>Account Types</Label>
              </FieldTooltip>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_TYPES.map((type) => (
                  <Badge
                    key={type}
                    variant={(form.account_types ?? []).includes(type) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArrayItem("account_types", type)}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Investment Approach */}
        <Section title="My Investment Approach" icon={<TrendingUp className="h-4 w-4 text-accent-foreground" />} defaultOpen={shouldOpenSections}>
          <div className="space-y-6">
            <div className="space-y-4">
              <FieldTooltip tip="How you divide your money across risk levels" example="60% stable, 30% growth, 10% active">
                <Label>Risk Buckets (% of portfolio)</Label>
              </FieldTooltip>

              {(["stable", "growth", "active"] as const).map((type) => (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{type}</span>
                    <span className="font-medium">{((form.risk_profile as RiskProfile)?.[type] ?? 0)}%</span>
                  </div>
                  <Slider
                    value={[((form.risk_profile as RiskProfile)?.[type] ?? 0)]}
                    onValueChange={([v]) => handleRiskChange(type, v)}
                    max={100}
                    step={5}
                    className="py-2"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Asset classes you're interested in">
                <Label>Asset Classes I'm Interested In</Label>
              </FieldTooltip>
              <div className="flex flex-wrap gap-2">
                {ASSET_CLASSES.map((asset) => (
                  <Badge
                    key={asset}
                    variant={(form.interested_assets ?? []).includes(asset) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArrayItem("interested_assets", asset)}
                  >
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* How I Learn Best */}
        <Section title="How I Learn Best" icon={<BookOpen className="h-4 w-4 text-chart-3" />} defaultOpen={shouldOpenSections}>
          <div className="space-y-4">
            <div className="space-y-2">
              <FieldTooltip tip="How much detail Quinn should provide">
                <Label>Communication Style</Label>
              </FieldTooltip>
              <Select
                value={form.communication_style ?? "balanced"}
                onValueChange={(v) => handleChange("communication_style", v as QuinnContext["communication_style"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise - Give me quick answers</SelectItem>
                  <SelectItem value="balanced">Balanced - Explain when needed</SelectItem>
                  <SelectItem value="detailed">Detailed - Explain everything thoroughly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldTooltip tip="Topics you want to learn more about">
                <Label>Topics I Want to Learn</Label>
              </FieldTooltip>
              <div className="flex flex-wrap gap-2">
                {LEARNING_TOPICS.map((topic) => (
                  <Badge
                    key={topic}
                    variant={(form.learning_topics ?? []).includes(topic) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleArrayItem("learning_topics", topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}
