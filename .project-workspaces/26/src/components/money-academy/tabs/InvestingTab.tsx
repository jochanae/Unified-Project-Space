import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp, BarChart3, Shield, Clock, AlertCircle } from "lucide-react";

export const InvestingTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-green-500/10 border-emerald-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Investing Fundamentals</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Grow your wealth for the long term
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Disclaimer */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Disclaimer:</strong> This content is for educational purposes only and is not financial advice. Investing involves risk, including the possible loss of principal. Consider consulting a licensed financial advisor for personalized guidance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Why Invest */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Why Invest?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Investing allows your money to grow faster than inflation. While savings accounts might earn 1-5% interest, historically the stock market has averaged about 10% annual returns over the long term.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">The Power of Compound Growth</h4>
            <p className="text-sm text-muted-foreground mb-3">
              If you invest $200/month starting at age 25 with an average 7% annual return:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• At age 45: ~$104,000 (from $48,000 invested)</li>
              <li>• At age 55: ~$244,000 (from $72,000 invested)</li>
              <li>• At age 65: ~$525,000 (from $96,000 invested)</li>
            </ul>
            <p className="text-sm text-green-600 mt-2">
              Time in the market is more powerful than timing the market.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Types */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            Types of Investments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="stocks">
              <AccordionTrigger className="text-left font-medium">
                Stocks (Equities)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Shares of ownership in a company.</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Potential return:</strong> High (historically 10% average annually)</li>
                  <li><strong className="text-foreground">Risk:</strong> High—prices can be volatile</li>
                  <li><strong className="text-foreground">Best for:</strong> Long-term growth (5+ year horizon)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bonds">
              <AccordionTrigger className="text-left font-medium">
                Bonds (Fixed Income)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Loans to governments or corporations that pay interest.</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Potential return:</strong> Lower (3-5% typically)</li>
                  <li><strong className="text-foreground">Risk:</strong> Lower—more stable than stocks</li>
                  <li><strong className="text-foreground">Best for:</strong> Income, portfolio balance, shorter time horizons</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mutual-funds">
              <AccordionTrigger className="text-left font-medium">
                Mutual Funds
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Pooled money from many investors, professionally managed.</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Diversification:</strong> Instant—one fund holds many securities</li>
                  <li><strong className="text-foreground">Cost:</strong> Expense ratios vary (0.1% to 1%+ annually)</li>
                  <li><strong className="text-foreground">Best for:</strong> Hands-off investors who want diversification</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="etfs">
              <AccordionTrigger className="text-left font-medium">
                ETFs (Exchange-Traded Funds)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Similar to mutual funds but traded like stocks.</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Cost:</strong> Often lower than mutual funds</li>
                  <li><strong className="text-foreground">Flexibility:</strong> Can buy/sell throughout the day</li>
                  <li><strong className="text-foreground">Popular types:</strong> Index ETFs (S&P 500, Total Market)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="index-funds">
              <AccordionTrigger className="text-left font-medium">
                Index Funds
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Track a market index (like S&P 500) rather than active management.</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Cost:</strong> Very low expense ratios (0.03-0.20%)</li>
                  <li><strong className="text-foreground">Performance:</strong> Match the market (most active funds underperform)</li>
                  <li><strong className="text-foreground">Best for:</strong> Long-term, buy-and-hold investors</li>
                </ul>
                <p className="text-sm italic">Many financial experts recommend low-cost index funds for most investors.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Getting Started with Investing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {[
              {
                step: "Build your emergency fund first",
                desc: "Have 3-6 months of expenses saved before investing."
              },
              {
                step: "Pay off high-interest debt",
                desc: "Credit card interest (15-25%) often exceeds investment returns."
              },
              {
                step: "Start with retirement accounts",
                desc: "401(k) with employer match = free money. Then consider IRAs."
              },
              {
                step: "Choose low-cost index funds",
                desc: "A simple S&P 500 or Total Market index fund is a great start."
              },
              {
                step: "Automate your contributions",
                desc: "Set up automatic investments on payday—treat it like a bill."
              },
              {
                step: "Stay the course",
                desc: "Don't panic sell during market drops. Time heals volatility."
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

      {/* Common Mistakes */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Common Investing Mistakes to Avoid</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong className="text-foreground">Timing the market:</strong> Missing just the 10 best days can halve your returns</li>
            <li>• <strong className="text-foreground">Checking too often:</strong> Daily checking leads to emotional decisions</li>
            <li>• <strong className="text-foreground">Picking individual stocks:</strong> Hard to beat index funds consistently</li>
            <li>• <strong className="text-foreground">High fees:</strong> A 1% fee vs 0.1% can cost $100,000+ over 30 years</li>
            <li>• <strong className="text-foreground">Not diversifying:</strong> Don't put all eggs in one basket</li>
            <li>• <strong className="text-foreground">Waiting to start:</strong> Time in market beats timing the market</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
