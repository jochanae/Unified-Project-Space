import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingDown, Scale, Flame, Snowflake, AlertTriangle } from "lucide-react";

export const DebtTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-red-500/10 via-card to-orange-500/10 border-red-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/20">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Debt Management</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Strategies to pay off debt and achieve financial freedom
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Understanding Debt */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-500" />
            Understanding Different Types of Debt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="good-debt">
              <AccordionTrigger className="text-left font-medium">
                "Good" Debt
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Debt that can increase your net worth or income over time:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Mortgage:</strong> Builds equity in an appreciating asset</li>
                  <li><strong className="text-foreground">Student loans:</strong> Invests in earning potential (ideally at low interest)</li>
                  <li><strong className="text-foreground">Business loans:</strong> Funds income-generating ventures</li>
                </ul>
                <p className="text-sm italic">Even "good" debt should be managed carefully and paid off strategically.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bad-debt">
              <AccordionTrigger className="text-left font-medium">
                "Bad" Debt
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Debt for depreciating assets or consumption:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong className="text-foreground">Credit cards:</strong> High interest (15-25%+), often for everyday purchases</li>
                  <li><strong className="text-foreground">Payday loans:</strong> Extremely high interest, predatory terms</li>
                  <li><strong className="text-foreground">Auto loans:</strong> Cars depreciate immediately (try to minimize)</li>
                  <li><strong className="text-foreground">Personal loans for consumption:</strong> Vacations, electronics financed at high rates</li>
                </ul>
                <p className="text-sm italic">Prioritize paying off high-interest "bad" debt first.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Payoff Strategies */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Debt Payoff Strategies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avalanche Method */}
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Snowflake className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-foreground">Debt Avalanche Method</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Pay off debts in order of highest to lowest interest rate.
            </p>
            <ol className="list-decimal ml-4 space-y-1 text-sm text-muted-foreground">
              <li>List all debts by interest rate (highest first)</li>
              <li>Make minimum payments on all debts</li>
              <li>Put extra money toward the highest-interest debt</li>
              <li>Once paid off, roll that payment to the next highest</li>
            </ol>
            <p className="text-sm text-green-600 mt-3">
              ✓ Mathematically optimal—saves the most on interest
            </p>
          </div>

          {/* Snowball Method */}
          <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <h4 className="font-medium text-foreground">Debt Snowball Method</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Pay off debts in order of smallest to largest balance.
            </p>
            <ol className="list-decimal ml-4 space-y-1 text-sm text-muted-foreground">
              <li>List all debts by balance (smallest first)</li>
              <li>Make minimum payments on all debts</li>
              <li>Put extra money toward the smallest balance</li>
              <li>Once paid off, roll that payment to the next smallest</li>
            </ol>
            <p className="text-sm text-green-600 mt-3">
              ✓ Psychologically motivating—quick wins build momentum
            </p>
          </div>

          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>Which should you choose?</strong> If you need motivation and quick wins, try the Snowball. If you want to minimize total interest paid, use the Avalanche. Both work—the best method is the one you'll stick with.
          </p>
        </CardContent>
      </Card>

      {/* Warning Signs */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Warning Signs of Debt Problems
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Only making minimum payments on credit cards
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Using credit cards for necessities (groceries, gas)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Debt-to-income ratio over 40%
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Hiding debt from family members
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Taking cash advances from credit cards
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">⚠</span>
              Receiving calls from debt collectors
            </li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            If you recognize these signs, consider speaking with a nonprofit credit counselor for free guidance.
          </p>
        </CardContent>
      </Card>

      {/* Practical Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Debt Payoff Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Negotiate lower interest rates—call your credit card company and ask</li>
            <li>• Consider balance transfer cards (0% APR promotions) for high-interest debt</li>
            <li>• Sell unused items and put proceeds toward debt</li>
            <li>• Increase income with side work and dedicate it to debt</li>
            <li>• Stop using credit cards while paying off debt</li>
            <li>• Track your payoff progress with CoinsBloom's Debt Management page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
