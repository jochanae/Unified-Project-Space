import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, X, ArrowRight } from "lucide-react";
import { useSmsBillMatches } from "@/hooks/useSmsBillMatches";

const SmsBillMatchBanner = () => {
  const { pendingMatches, confirmMatch, dismissMatch } = useSmsBillMatches();

  if (pendingMatches.length === 0) return null;

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">SMS Bill Matches</h3>
            <p className="text-xs text-muted-foreground">
              {pendingMatches.length} SMS transaction{pendingMatches.length !== 1 ? 's' : ''} may match unpaid bills
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {pendingMatches.map((match) => {
            const tx = match.transaction;
            const bill = match.bill;
            if (!tx || !bill) return null;

            return (
              <div
                key={match.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border border-border"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{tx.title}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm text-purple-600 dark:text-purple-400 font-medium truncate">
                      {bill.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      SMS: ${Number(tx.amount).toLocaleString()} → Bill: ${Number(bill.amount).toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        match.confidence === "medium"
                          ? "border-orange-300 text-orange-600"
                          : "border-muted text-muted-foreground"
                      }`}
                    >
                      {match.confidence}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => dismissMatch(match.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() =>
                      confirmMatch(match.id, bill.id, tx.id, Number(tx.amount))
                    }
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Match
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmsBillMatchBanner;
