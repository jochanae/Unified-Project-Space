import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart, Home, Baby, GraduationCap, Briefcase, HeartPulse } from "lucide-react";

export const LifeEventsTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-pink-500/10 via-card to-rose-500/10 border-pink-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-pink-500/20">
              <Heart className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Life Events & Money</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Navigate major life changes with financial confidence
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Life Events */}
      <Card className="bg-card border-border/50">
        <CardContent className="pt-6">
          <Accordion type="single" collapsible className="w-full">
            {/* Getting Married */}
            <AccordionItem value="marriage">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <span className="font-medium">Getting Married</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Before the Wedding</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Have honest conversations about money, debt, and financial goals</li>
                    <li>Create a wedding budget and stick to it</li>
                    <li>Discuss joint vs. separate finances</li>
                    <li>Review each other's credit reports</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">After the Wedding</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Update beneficiaries on all accounts and insurance</li>
                    <li>Decide on bank account structure (joint, separate, or hybrid)</li>
                    <li>Create a combined budget</li>
                    <li>Consider updating your tax withholding (married filing jointly often saves money)</li>
                    <li>Update your emergency fund for two people (3-6 months of combined expenses)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Buying a Home */}
            <AccordionItem value="home">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Buying a Home</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Preparing to Buy</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Save for down payment (aim for 20% to avoid PMI, but 3-5% is often acceptable)</li>
                    <li>Build strong credit (740+ for best rates)</li>
                    <li>Get pre-approved for a mortgage before house hunting</li>
                    <li>Budget for closing costs (2-5% of purchase price)</li>
                    <li>Save for moving, repairs, and furnishing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Affordability Guidelines</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Keep housing costs under 28% of gross income</li>
                    <li>Total debt payments under 36% of gross income</li>
                    <li>Don't buy more house than you need just because you're approved for more</li>
                    <li>Factor in property taxes, insurance, HOA, and maintenance (1-2% of home value/year)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Having a Baby */}
            <AccordionItem value="baby">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <Baby className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Having a Baby</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Before Baby Arrives</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Review health insurance—add baby within 30 days of birth</li>
                    <li>Understand maternity/paternity leave and short-term disability benefits</li>
                    <li>Start a baby fund for initial costs ($10,000-$15,000 first year)</li>
                    <li>Research childcare costs in your area</li>
                    <li>Get life insurance if you don't have it</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">After Baby Arrives</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Update your budget for new expenses (diapers, formula, childcare)</li>
                    <li>Start a 529 college savings plan (tax-advantaged)</li>
                    <li>Create or update your will and name guardians</li>
                    <li>Update beneficiaries on all accounts</li>
                    <li>Consider a dependent care FSA for childcare tax savings</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Paying for College */}
            <AccordionItem value="college">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium">Paying for College</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Saving Strategies</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li><strong>529 Plans:</strong> Tax-free growth for education expenses</li>
                    <li><strong>Coverdell ESA:</strong> More flexibility but lower limits ($2,000/year)</li>
                    <li>Start early—even small amounts grow significantly over 18 years</li>
                    <li>Grandparents can contribute to 529s too</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Paying for College</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Complete the FAFSA for federal aid (free money and low-interest loans)</li>
                    <li>Apply for scholarships—billions go unclaimed each year</li>
                    <li>Consider community college for first two years</li>
                    <li>Prioritize grants and scholarships over loans</li>
                    <li>If borrowing, federal loans generally have better terms than private</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Losing a Job */}
            <AccordionItem value="job-loss">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">Losing a Job</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Immediate Steps</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>File for unemployment benefits immediately</li>
                    <li>Review your severance package carefully</li>
                    <li>Understand your health insurance options (COBRA or marketplace)</li>
                    <li>Don't cash out your 401(k)—roll it to an IRA</li>
                    <li>Cut non-essential spending immediately</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">While Job Searching</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Use your emergency fund—this is what it's for</li>
                    <li>Prioritize essential bills (housing, utilities, food, insurance)</li>
                    <li>Call creditors if you'll miss payments—many offer hardship programs</li>
                    <li>Consider temporary or freelance work</li>
                    <li>Update your resume and LinkedIn before applying</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Medical Emergency */}
            <AccordionItem value="medical">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-3">
                  <HeartPulse className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Medical Emergency</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4 pl-8">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Managing Medical Bills</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Request an itemized bill and check for errors</li>
                    <li>Ask about financial assistance programs (hospitals often have them)</li>
                    <li>Negotiate—medical bills are often negotiable</li>
                    <li>Set up a payment plan (often 0% interest)</li>
                    <li>Pay medical debt last if choosing between bills—it's less damaging to credit</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Prevention</h4>
                  <ul className="list-disc ml-4 space-y-1 text-sm">
                    <li>Maintain adequate health insurance</li>
                    <li>Build an emergency fund to cover your deductible</li>
                    <li>Use an HSA if eligible—triple tax advantage for medical expenses</li>
                    <li>Consider disability insurance (especially if self-employed)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* General Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Life Event Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Update your budget to reflect new income or expenses</li>
            <li>• Review and update beneficiaries on all accounts</li>
            <li>• Check if your insurance coverage is still adequate</li>
            <li>• Reassess your emergency fund needs</li>
            <li>• Update your will and estate documents</li>
            <li>• Adjust retirement contributions if income changes</li>
            <li>• Update your tax withholding if needed</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
