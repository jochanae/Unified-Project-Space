import { Info, Lightbulb, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ReportsInfoCard = () => {
  return (
    <div className="p-4">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">Reports (Your Financial Analytics)</h3>
              </div>
              
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-semibold">• Spending Analysis:</span>{" "}
                  Category breakdowns, merchant trends, monthly comparisons
                </li>
                <li>
                  <span className="font-semibold">• Income vs Expenses:</span>{" "}
                  Cash flow tracking, surplus/deficit patterns over time
                </li>
                <li>
                  <span className="font-semibold">• Custom Reports:</span>{" "}
                  Filter by date range, category, account - export to PDF or CSV
                </li>
              </ul>

              <p className="text-sm text-muted-foreground">
                Use these insights to find savings opportunities and track progress toward your financial goals.
              </p>

              <Button variant="link" className="p-0 h-auto text-primary">
                Learn more & share your feedback
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsInfoCard;
