import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Receipt, FileText, Calendar, DollarSign, AlertCircle } from "lucide-react";

export const TaxesTab = () => {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-violet-500/10 via-card to-purple-500/10 border-violet-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/20">
              <Receipt className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Tax Basics</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Understand your taxes and maximize your refund
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
              <strong className="text-foreground">Disclaimer:</strong> This is general educational information, not tax advice. Tax laws change frequently. Consult a qualified tax professional for your specific situation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Filing Basics */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Tax Filing Basics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="who-files">
              <AccordionTrigger className="text-left font-medium">
                Who Needs to File?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p>You generally need to file if your income exceeds certain thresholds:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Single under 65: $13,850+ (2023)</li>
                  <li>Married filing jointly under 65: $27,700+ (2023)</li>
                  <li>Self-employment income of $400+</li>
                </ul>
                <p className="text-sm italic">Even if you don't need to file, you should if you had taxes withheld (to get a refund) or qualify for credits.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="filing-status">
              <AccordionTrigger className="text-left font-medium">
                Filing Status Options
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li><strong className="text-foreground">Single:</strong> Unmarried, divorced, or legally separated</li>
                  <li><strong className="text-foreground">Married Filing Jointly:</strong> Usually best for married couples</li>
                  <li><strong className="text-foreground">Married Filing Separately:</strong> Rarely beneficial, but may help in specific situations</li>
                  <li><strong className="text-foreground">Head of Household:</strong> Unmarried with qualifying dependent—better rates than single</li>
                  <li><strong className="text-foreground">Qualifying Widow(er):</strong> Special status for 2 years after spouse's death</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="standard-vs-itemized">
              <AccordionTrigger className="text-left font-medium">
                Standard vs. Itemized Deductions
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <p><strong className="text-foreground">Standard Deduction (2023):</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Single: $13,850</li>
                  <li>Married Filing Jointly: $27,700</li>
                  <li>Head of Household: $20,800</li>
                </ul>
                <p className="mt-3"><strong className="text-foreground">Itemize if your deductions exceed the standard:</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Mortgage interest</li>
                  <li>State and local taxes (up to $10,000)</li>
                  <li>Charitable donations</li>
                  <li>Medical expenses over 7.5% of income</li>
                </ul>
                <p className="text-sm italic">Most people (about 90%) take the standard deduction.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-500" />
            Important Tax Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: "January 31", desc: "Employers send W-2 forms; 1099s issued" },
              { date: "April 15", desc: "Tax filing deadline (may extend to next business day)" },
              { date: "April 15", desc: "IRA contribution deadline for prior year" },
              { date: "October 15", desc: "Extended filing deadline (if you filed for extension)" },
              { date: "Quarterly", desc: "Estimated tax payments due for self-employed (Apr 15, Jun 15, Sep 15, Jan 15)" }
            ].map((item, index) => (
              <div key={index} className="flex gap-4 items-start bg-muted/30 rounded-lg p-3">
                <span className="font-bold text-sm text-primary min-w-[90px]">{item.date}</span>
                <span className="text-sm text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Deductions & Credits */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Common Tax Deductions & Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="deductions">
              <AccordionTrigger className="text-left font-medium">
                Tax Deductions (Reduce Taxable Income)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li><strong className="text-foreground">401(k) contributions:</strong> Pre-tax up to $22,500 ($30,000 if 50+)</li>
                  <li><strong className="text-foreground">Traditional IRA:</strong> Up to $6,500 ($7,500 if 50+), if eligible</li>
                  <li><strong className="text-foreground">HSA contributions:</strong> $3,850 individual / $7,750 family</li>
                  <li><strong className="text-foreground">Student loan interest:</strong> Up to $2,500</li>
                  <li><strong className="text-foreground">Educator expenses:</strong> $300 for teachers</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="credits">
              <AccordionTrigger className="text-left font-medium">
                Tax Credits (Direct Dollar-for-Dollar Reduction)
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-3">
                <ul className="space-y-2">
                  <li><strong className="text-foreground">Child Tax Credit:</strong> Up to $2,000 per child</li>
                  <li><strong className="text-foreground">Earned Income Tax Credit:</strong> Up to $7,430 for low-to-moderate income</li>
                  <li><strong className="text-foreground">American Opportunity Credit:</strong> Up to $2,500 for college</li>
                  <li><strong className="text-foreground">Lifetime Learning Credit:</strong> Up to $2,000 for education</li>
                  <li><strong className="text-foreground">Saver's Credit:</strong> Up to $1,000 for retirement contributions (low income)</li>
                  <li><strong className="text-foreground">Child and Dependent Care Credit:</strong> Up to $3,000-$6,000 for childcare</li>
                </ul>
                <p className="text-sm text-green-600 mt-2">Credits are more valuable than deductions—they reduce your actual tax bill.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Filing Tips */}
      <Card className="bg-muted/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Tax Filing Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• File electronically for faster refunds (usually within 21 days)</li>
            <li>• Use direct deposit for fastest refund delivery</li>
            <li>• Keep records for at least 3 years (7 for some situations)</li>
            <li>• If you can't file by April 15, file for a free extension (doesn't extend payment deadline)</li>
            <li>• Free filing available at IRS Free File (if income under $79,000)</li>
            <li>• Consider a tax professional if you have complex situations</li>
            <li>• Use CoinsBloom's Advanced Tools → Tax tab to track deductions year-round</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
