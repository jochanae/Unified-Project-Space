import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PiggyBank, Target, Shield, TrendingUp, Lightbulb } from "lucide-react";

export const SavingTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-green-500/10 via-card to-emerald-500/10 border-green-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-500/20">
              <PiggyBank className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Saving Strategies</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Build your financial safety net and achieve your goals
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Emergency Fund */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Emergency Fund Essentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            An emergency fund is money set aside for unexpected expenses like medical bills, car repairs, or job loss. It's your first line of financial defense.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">How Much Should You Save?</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Starter goal:</strong> $1,000 for immediate emergencies</li>
              <li><strong className="text-foreground">Minimum goal:</strong> 3 months of essential expenses</li>
              <li><strong className="text-foreground">Ideal goal:</strong> 6 months of essential expenses</li>
              <li><strong className="text-foreground">Maximum security:</strong> 12 months for self-employed or variable income</li>
            </ul>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Where to Keep Your Emergency Fund</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">High-yield savings account:</strong> Earns interest while staying accessible</li>
              <li>• <strong className="text-foreground">Money market account:</strong> Similar to savings with potential check-writing ability</li>
              <li>• <strong className="text-foreground">Not in stocks:</strong> Too volatile for emergency needs</li>
              <li>• <strong className="text-foreground">Not in CDs:</strong> Penalties for early withdrawal</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Saving Goals */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Setting Saving Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="smart-goals">
              <AccordionTrigger className="text-left font-medium">
                SMART Goal Framework
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li><strong className="text-foreground">Specific:</strong> "Save $5,000 for a vacation" not "save more money"</li>
                  <li><strong className="text-foreground">Measurable:</strong> Track progress weekly or monthly</li>
                  <li><strong className="text-foreground">Achievable:</strong> Based on your income and expenses</li>
                  <li><strong className="text-foreground">Relevant:</strong> Aligned with your values and priorities</li>
                  <li><strong className="text-foreground">Time-bound:</strong> Set a deadline (e.g., "by December")</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="short-term">
              <AccordionTrigger className="text-left font-medium">
                Short-Term Goals (Under 1 Year)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Examples of short-term savings goals:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Holiday gifts</li>
                  <li>Small vacation or weekend trip</li>
                  <li>New phone or electronics</li>
                  <li>Car maintenance or repairs</li>
                  <li>Annual subscriptions paid yearly</li>
                </ul>
                <p className="text-sm italic">Tip: Use CoinsBloom's Goals feature to track these and contribute regularly.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="medium-term">
              <AccordionTrigger className="text-left font-medium">
                Medium-Term Goals (1-5 Years)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Examples of medium-term savings goals:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Down payment on a car</li>
                  <li>Wedding or major celebration</li>
                  <li>Home renovation</li>
                  <li>Starting a business</li>
                  <li>Graduate school tuition</li>
                </ul>
                <p className="text-sm italic">Consider a high-yield savings account or CD ladder for these goals.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="long-term">
              <AccordionTrigger className="text-left font-medium">
                Long-Term Goals (5+ Years)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Examples of long-term savings goals:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>House down payment</li>
                  <li>Children's college fund</li>
                  <li>Retirement (see Retirement tab)</li>
                  <li>Early financial independence</li>
                </ul>
                <p className="text-sm italic">Long-term goals may benefit from investment accounts for potential growth.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Saving Strategies */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Practical Saving Strategies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {[
              {
                title: "Automate Your Savings",
                desc: "Set up automatic transfers to savings on payday. What you don't see, you don't spend."
              },
              {
                title: "Round-Up Savings",
                desc: "Round up purchases to the nearest dollar and save the difference. $3.50 purchase = $0.50 to savings."
              },
              {
                title: "No-Spend Challenges",
                desc: "Pick a category (eating out, clothes) and don't spend in it for a week or month. Save what you would have spent."
              },
              {
                title: "Save Windfalls",
                desc: "Put at least 50% of unexpected money (tax refunds, bonuses, gifts) directly into savings."
              },
              {
                title: "The 24-Hour Rule",
                desc: "Wait 24 hours before any non-essential purchase over $50. Often, the urge passes."
              },
              {
                title: "Track Subscriptions",
                desc: "Review all recurring charges. Cancel what you don't use and redirect that money to savings."
              }
            ].map((item, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Quick Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Start small—even $25/month adds up to $300/year</li>
            <li>• Keep savings in a separate bank to reduce temptation</li>
            <li>• Name your savings accounts (e.g., "Hawaii Trip 2025")</li>
            <li>• Celebrate milestones to stay motivated</li>
            <li>• Review and increase savings rate when you get a raise</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
