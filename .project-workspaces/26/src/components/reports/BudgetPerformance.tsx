import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface BudgetPerformanceProps {
  onTrack: number;
  warning: number;
  overBudget: number;
}

const BudgetPerformance = ({ onTrack, warning, overBudget }: BudgetPerformanceProps) => {
  const total = onTrack + warning + overBudget;
  
  const items = [
    {
      label: "On Track",
      count: onTrack,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      barColor: "bg-emerald-500",
    },
    {
      label: "Warning",
      count: warning,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      barColor: "bg-amber-500",
    },
    {
      label: "Over Budget",
      count: overBudget,
      icon: XCircle,
      color: "text-rose-600",
      bgColor: "bg-rose-100",
      barColor: "bg-rose-500",
    },
  ];

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Budget Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-full ${item.bgColor}`}>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm font-semibold">
                  {item.count} of {total}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${item.barColor} rounded-full transition-all`}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetPerformance;
