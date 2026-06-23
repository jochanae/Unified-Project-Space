import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CreditCard, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export const CreditTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-card to-indigo-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Understanding Credit</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Build and maintain excellent credit
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Credit Score Basics */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">What is a Credit Score?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A credit score is a three-digit number (300-850) that represents your creditworthiness. Lenders use it to decide whether to approve you for loans and what interest rate to charge.
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { range: "800-850", label: "Exceptional", color: "bg-green-500/20 text-green-600 border-green-500/30" },
              { range: "740-799", label: "Very Good", color: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" },
              { range: "670-739", label: "Good", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" },
              { range: "580-669", label: "Fair", color: "bg-orange-500/20 text-orange-600 border-orange-500/30" },
              { range: "300-579", label: "Poor", color: "bg-red-500/20 text-red-600 border-red-500/30" },
            ].map((item, index) => (
              <div key={index} className={`rounded-lg p-3 text-center border ${item.color}`}>
                <p className="font-bold text-sm">{item.range}</p>
                <p className="text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Factors */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            What Affects Your Credit Score?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                factor: "Payment History",
                weight: "35%",
                desc: "Whether you pay bills on time. Even one late payment can hurt.",
                color: "bg-blue-500"
              },
              {
                factor: "Credit Utilization",
                weight: "30%",
                desc: "How much of your available credit you're using. Keep under 30%, ideally under 10%.",
                color: "bg-green-500"
              },
              {
                factor: "Length of Credit History",
                weight: "15%",
                desc: "How long you've had credit accounts. Older is better.",
                color: "bg-yellow-500"
              },
              {
                factor: "Credit Mix",
                weight: "10%",
                desc: "Having different types of credit (cards, loans, mortgage).",
                color: "bg-purple-500"
              },
              {
                factor: "New Credit",
                weight: "10%",
                desc: "Recently opened accounts and hard inquiries. Too many can hurt.",
                color: "bg-orange-500"
              }
            ].map((item, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className={`w-12 h-12 rounded-lg ${item.color}/20 flex items-center justify-center flex-shrink-0`}>
                  <span className={`font-bold text-sm ${item.color.replace('bg-', 'text-')}`}>{item.weight}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.factor}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improving Credit */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">How to Improve Your Credit Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pay-on-time">
              <AccordionTrigger className="text-left font-medium">
                Always Pay on Time
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Set up autopay for at least the minimum payment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Use CoinsBloom's bill reminders to never miss a due date</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>If you miss a payment, pay as soon as possible—it won't report until 30 days late</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="utilization">
              <AccordionTrigger className="text-left font-medium">
                Lower Your Credit Utilization
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Pay down balances (aim for under 30% of your limit)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Request a credit limit increase (don't spend it!)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Pay your balance before the statement closing date</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="history">
              <AccordionTrigger className="text-left font-medium">
                Build Credit History
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Keep old accounts open (even if unused)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Become an authorized user on a family member's old, well-managed card</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Consider a secured credit card if you're building from scratch</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="inquiries">
              <AccordionTrigger className="text-left font-medium">
                Limit Hard Inquiries
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Only apply for credit when needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Rate shop for loans within a 14-45 day window (counts as one inquiry)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Checking your own credit is a "soft" inquiry and doesn't hurt</span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Common Myths */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Credit Score Myths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                myth: "Checking your own credit hurts your score",
                truth: "Checking your own credit is a 'soft inquiry' and has no impact."
              },
              {
                myth: "You need to carry a balance to build credit",
                truth: "Paying in full each month is better. You still build credit and avoid interest."
              },
              {
                myth: "Closing old cards improves your score",
                truth: "Closing old cards can hurt by reducing credit history length and increasing utilization."
              },
              {
                myth: "Income affects your credit score",
                truth: "Income isn't reported to credit bureaus or factored into your score."
              }
            ].map((item, index) => (
              <div key={index} className="bg-muted/30 rounded-lg p-4">
                <p className="text-sm text-red-500 font-medium mb-1">❌ Myth: {item.myth}</p>
                <p className="text-sm text-green-600">✓ Truth: {item.truth}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Free Credit Reports */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Check Your Credit for Free</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You can get free credit reports from all three bureaus (Experian, TransUnion, Equifax) once per year at <strong className="text-foreground">AnnualCreditReport.com</strong>—the only official site.
          </p>
          <p className="text-sm text-muted-foreground">
            Many banks and credit cards also provide free credit score monitoring. Track your score over time with CoinsBloom's Credit page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
