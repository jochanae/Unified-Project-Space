import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Building2, Wallet, TrendingUp, Calculator } from "lucide-react";

export const RetirementTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 border-amber-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Retirement Planning</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Secure your future with smart retirement planning
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Why Start Early */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            The Power of Starting Early
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Time is your greatest asset when saving for retirement. The earlier you start, the more compound growth works in your favor.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Example: $200/month at 7% annual return</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium text-foreground">Start at 25:</p>
                <p className="text-muted-foreground">40 years of growth</p>
                <p className="text-green-600 font-bold">≈ $525,000 at 65</p>
                <p className="text-xs text-muted-foreground">(Invested: $96,000)</p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-foreground">Start at 35:</p>
                <p className="text-muted-foreground">30 years of growth</p>
                <p className="text-yellow-600 font-bold">≈ $244,000 at 65</p>
                <p className="text-xs text-muted-foreground">(Invested: $72,000)</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Starting 10 years earlier with the same contribution more than doubles your retirement savings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Accounts */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Types of Retirement Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="401k">
              <AccordionTrigger className="text-left font-medium">
                401(k) / 403(b)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Employer-sponsored retirement plans with tax advantages.</p>
                <ul className="space-y-2">
                  <li><strong className="text-foreground">2024 Contribution Limit:</strong> $23,000 ($30,500 if 50+)</li>
                  <li><strong className="text-foreground">Tax Treatment:</strong> Traditional = pre-tax contributions, taxed at withdrawal</li>
                  <li><strong className="text-foreground">Employer Match:</strong> Free money! Always contribute at least enough to get the full match</li>
                  <li><strong className="text-foreground">Roth 401(k):</strong> After-tax contributions, tax-free growth and withdrawals</li>
                </ul>
                <p className="text-sm text-green-600 mt-2">
                  ✓ Priority #1: Get your employer match—it's a 50-100% instant return!
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="traditional-ira">
              <AccordionTrigger className="text-left font-medium">
                Traditional IRA
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Individual Retirement Account you open yourself.</p>
                <ul className="space-y-2">
                  <li><strong className="text-foreground">2024 Contribution Limit:</strong> $7,000 ($8,000 if 50+)</li>
                  <li><strong className="text-foreground">Tax Treatment:</strong> May be tax-deductible; taxed at withdrawal</li>
                  <li><strong className="text-foreground">Deduction Limits:</strong> Income limits apply if you have a workplace plan</li>
                  <li><strong className="text-foreground">Required Minimum Distributions:</strong> Must start at age 73</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="roth-ira">
              <AccordionTrigger className="text-left font-medium">
                Roth IRA
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Tax-free growth and withdrawals in retirement.</p>
                <ul className="space-y-2">
                  <li><strong className="text-foreground">2024 Contribution Limit:</strong> $7,000 ($8,000 if 50+)</li>
                  <li><strong className="text-foreground">Tax Treatment:</strong> After-tax contributions; tax-free growth and withdrawals</li>
                  <li><strong className="text-foreground">Income Limits:</strong> Phase-out starts at $146k single / $230k married</li>
                  <li><strong className="text-foreground">Flexibility:</strong> Contributions (not earnings) can be withdrawn anytime</li>
                  <li><strong className="text-foreground">No RMDs:</strong> No required minimum distributions during your lifetime</li>
                </ul>
                <p className="text-sm text-green-600 mt-2">
                  ✓ Great for younger savers who expect higher taxes in retirement
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sep-simple">
              <AccordionTrigger className="text-left font-medium">
                SEP-IRA & SIMPLE IRA
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Retirement plans for self-employed and small businesses.</p>
                <ul className="space-y-2">
                  <li><strong className="text-foreground">SEP-IRA:</strong> Contribute up to 25% of net self-employment income (max $69,000)</li>
                  <li><strong className="text-foreground">SIMPLE IRA:</strong> Employee contributions up to $16,000, plus employer match</li>
                  <li><strong className="text-foreground">Best for:</strong> Freelancers, contractors, and small business owners</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* How Much to Save */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-500" />
            How Much Should You Save?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">The 15% Rule</h4>
              <p className="text-sm text-muted-foreground">
                Aim to save 15% of your pre-tax income for retirement (including employer match). If you can't start there, begin with what you can and increase by 1% each year.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Savings Milestones by Age</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• <strong>Age 30:</strong> 1x your annual salary saved</li>
                <li>• <strong>Age 40:</strong> 3x your annual salary saved</li>
                <li>• <strong>Age 50:</strong> 6x your annual salary saved</li>
                <li>• <strong>Age 60:</strong> 8x your annual salary saved</li>
                <li>• <strong>Age 67:</strong> 10x your annual salary saved</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">The 4% Rule</h4>
              <p className="text-sm text-muted-foreground">
                To estimate how much you need, multiply your annual expenses by 25. If you need $50,000/year in retirement, aim for $1.25 million saved. This allows a 4% annual withdrawal rate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Priority Order */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            Retirement Savings Priority Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {[
              {
                step: "Get your employer 401(k) match",
                desc: "Contribute at least enough to get the full employer match—it's free money with 50-100% instant return."
              },
              {
                step: "Pay off high-interest debt",
                desc: "Credit card interest often exceeds investment returns. Eliminate it before maxing retirement accounts."
              },
              {
                step: "Build emergency fund",
                desc: "Have 3-6 months of expenses saved before aggressively saving for retirement."
              },
              {
                step: "Max out Roth IRA (if eligible)",
                desc: "Tax-free growth is powerful. Contribute up to $7,000/year ($8,000 if 50+)."
              },
              {
                step: "Max out 401(k)",
                desc: "After Roth IRA, go back and max your 401(k) to $23,000/year ($30,500 if 50+)."
              },
              {
                step: "HSA (if available)",
                desc: "Triple tax advantage: deductible contributions, tax-free growth, tax-free withdrawals for medical expenses."
              }
            ].map((item, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{item.step}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Retirement Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Increase contributions by 1% each year or with every raise</li>
            <li>• Don't cash out old 401(k)s—roll them to an IRA or new employer's plan</li>
            <li>• Keep investment fees low (target under 0.5% expense ratio)</li>
            <li>• Use target-date funds for simple, automatic diversification</li>
            <li>• Don't try to time the market—stay invested through ups and downs</li>
            <li>• Review beneficiary designations annually</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
