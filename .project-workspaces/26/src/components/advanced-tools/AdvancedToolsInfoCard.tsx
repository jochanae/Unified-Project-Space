import { Link } from "react-router-dom";
import { Info, Lightbulb, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const AdvancedToolsInfoCard = () => {
  return (
    <div className="px-4 py-6">
      <Card className="border-2 border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Advanced Tools (Professional Financial Planning)
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Tax Planning:</strong> Track deductions, organize documents, maximize refunds with optimization tips
                </li>
                <li>
                  <strong className="text-foreground">Insurance Hub:</strong> Manage all your policies (life, health, auto, home) in one place
                </li>
                <li>
                  <strong className="text-foreground">Investments:</strong> Track portfolio performance, retirement accounts, and contribution limits
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Premium features for serious financial planning - track tax deductions, manage insurance costs, and plan for retirement.
              </p>
              <Link
                to="/help-center"
                className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                Learn more & share your feedback
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
