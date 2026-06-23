import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PieChart, CheckCircle2, Lightbulb, Calculator } from "lucide-react";

export const BudgetingTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/20">
              <PieChart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Budgeting Basics</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Master the foundation of financial success
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* What is Budgeting */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            What is Budgeting?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A budget is a spending plan based on your income. It tells your money where to go instead of wondering where it went. Budgeting helps you:
          </p>
          <ul className="space-y-2">
            {[
              "Understand your spending habits",
              "Prioritize your financial goals",
              "Prepare for emergencies",
              "Reduce financial stress",
              "Build wealth over time"
            ].map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Popular Budgeting Methods */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            Popular Budgeting Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="50-30-20">
              <AccordionTrigger className="text-left font-medium">
                The 50/30/20 Rule
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>This simple rule divides your after-tax income into three categories:</p>
                <ul className="space-y-2 ml-4">
                  <li><strong className="text-foreground">50% Needs:</strong> Rent/mortgage, utilities, groceries, insurance, minimum debt payments, transportation.</li>
                  <li><strong className="text-foreground">30% Wants:</strong> Dining out, entertainment, hobbies, subscriptions, shopping.</li>
                  <li><strong className="text-foreground">20% Savings & Debt:</strong> Emergency fund, retirement contributions, extra debt payments, investments.</li>
                </ul>
                <p className="text-sm italic">Example: If you earn $4,000/month after taxes, allocate $2,000 to needs, $1,200 to wants, and $800 to savings/debt.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="zero-based">
              <AccordionTrigger className="text-left font-medium">
                Zero-Based Budgeting
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>With zero-based budgeting, every dollar has a job. Income minus expenses equals zero.</p>
                <p>Steps to implement:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>List your monthly income</li>
                  <li>List all expenses (fixed and variable)</li>
                  <li>Assign every dollar to a category</li>
                  <li>Adjust until income minus expenses equals zero</li>
                </ol>
                <p className="text-sm italic">This method works well for people who want complete control over their money and don't mind detailed tracking.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="envelope">
              <AccordionTrigger className="text-left font-medium">
                Envelope System
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>A cash-based system where you allocate money to physical (or digital) envelopes for each spending category.</p>
                <p>How it works:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Create envelopes for each category (groceries, gas, entertainment, etc.)</li>
                  <li>Put the budgeted cash amount in each envelope</li>
                  <li>Only spend what's in the envelope</li>
                  <li>When it's empty, stop spending in that category</li>
                </ol>
                <p className="text-sm italic">CoinsBloom's budgets work like digital envelopes—set a limit and track your spending against it.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pay-yourself-first">
              <AccordionTrigger className="text-left font-medium">
                Pay Yourself First
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>Prioritize savings by setting aside money before paying any other expenses.</p>
                <p>Implementation:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Determine your savings goal (e.g., 20% of income)</li>
                  <li>Set up automatic transfers to savings on payday</li>
                  <li>Live on what remains</li>
                </ol>
                <p className="text-sm italic">This method ensures you always save, even if you overspend in other areas.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started with Your Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {[
              {
                step: "Calculate your income",
                desc: "Add up all sources of monthly income after taxes."
              },
              {
                step: "Track your spending",
                desc: "Review bank statements or use CoinsBloom to categorize expenses for the past month."
              },
              {
                step: "Categorize expenses",
                desc: "Group spending into needs, wants, and savings/debt."
              },
              {
                step: "Set spending limits",
                desc: "Based on your income and priorities, set limits for each category."
              },
              {
                step: "Review and adjust",
                desc: "Check your budget weekly and adjust as needed. It takes 2-3 months to find what works."
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
    </div>
  );
};
