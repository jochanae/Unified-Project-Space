import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles, MessageCircle, FlaskConical } from "lucide-react";

interface BloomCoachTipsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTryExample: (text: string) => void;
}

const strategicInsights = [
  {
    category: "Strategic Optimizations",
    tips: [
      "Bill leveling: spread irregular expenses across 12 months to eliminate cash flow spikes",
      "Category rebalancing: redirect budget surpluses into higher-yield allocations automatically",
      "Break-even analysis: compare recurring costs against one-time capital expenditures for long-term savings",
      "Debt-to-savings pivot: once high-interest debt clears, redirect that exact payment into investments",
      "Tax-loss harvesting windows: review portfolio quarterly for strategic rebalancing opportunities",
    ],
  },
  {
    category: "Wealth Acceleration",
    tips: [
      "Contribution stacking: max employer match, then Roth IRA, then taxable — in that order",
      "Expense-to-investment conversion: identify recurring costs that can be eliminated and redirected",
      "Rate arbitrage: refinance debt when the spread between your rate and market rate exceeds 1.5%",
      "Income velocity: track dollars-per-hour across all income streams to optimize time allocation",
      "Compound leverage: even 1% higher returns over 20 years can mean 25%+ more at retirement",
    ],
  },
];

const howToExamples = [
  {
    category: "Financial Analysis",
    examples: [
      { icon: "—", text: "Run a cost-benefit analysis on replacing my HVAC system" },
      { icon: "—", text: "Compare my debt payoff strategies: avalanche vs snowball" },
      { icon: "—", text: "Calculate my break-even point if I refinance my car loan" },
      { icon: "—", text: "What's my effective savings rate after all obligations?" },
      { icon: "—", text: "Show me where I'm losing money to category overages" },
    ],
  },
  {
    category: "Portfolio Actions",
    examples: [
      { icon: "—", text: "Add my Schwab brokerage account with $45,000 balance" },
      { icon: "—", text: "I made a $500 extra payment on my mortgage principal" },
      { icon: "—", text: "Create a savings goal for a $15,000 home improvement project" },
      { icon: "—", text: "What's the opportunity cost of pulling $10K from investments?" },
      { icon: "—", text: "How should I allocate my $2,000 bonus this month?" },
    ],
  },
];

export function BloomCoachTipsDrawer({
  open,
  onOpenChange,
  onTryExample,
}: BloomCoachTipsDrawerProps) {
  const navigate = useNavigate();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Strategy & Analysis
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-70px)]">
          <div className="p-4 space-y-6">
            {/* Scenario Lab CTA */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-emerald-500/30 hover:bg-emerald-500/5"
              onClick={() => {
                onOpenChange(false);
                navigate("/scenario-lab");
              }}
            >
              <FlaskConical className="h-4 w-4 text-emerald-500" />
              <div className="text-left">
                <p className="text-sm font-medium">Scenario Lab</p>
                <p className="text-xs text-muted-foreground">Run cost-benefit analyses on major expenses</p>
              </div>
            </Button>

            {/* How-To Section */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                What You Can Ask Bloom
              </h3>
              {howToExamples.map((section) => (
                <div key={section.category} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {section.category}
                  </p>
                  <div className="space-y-1.5">
                    {section.examples.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          onTryExample(example.text);
                          onOpenChange(false);
                        }}
                        className="w-full text-left p-2.5 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors flex items-start gap-2"
                      >
                        <span className="shrink-0 text-muted-foreground">{example.icon}</span>
                        <span className="text-foreground">{example.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Strategic Insights */}
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-primary" />
                Strategic Insights
              </h3>
              {strategicInsights.map((section) => (
                <div key={section.category} className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {section.category}
                  </p>
                  <div className="space-y-1.5">
                    {section.tips.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-muted/30 text-sm text-foreground/80"
                      >
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
