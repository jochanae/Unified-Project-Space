import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

interface AssetAllocationChartProps {
  allocation: Record<string, number>;
  total: number;
}

const COLORS: Record<string, string> = {
  "Banking & Cash": "bg-primary",
  "Real Estate": "bg-green-500",
  "Investments": "bg-purple-500",
  "Retirement": "bg-blue-500",
  "Insurance & Annuities": "bg-teal-500",
  "Other": "bg-gray-400",
};

export function AssetAllocationChart({ allocation, total }: AssetAllocationChartProps) {
  const sortedEntries = Object.entries(allocation).sort((a, b) => b[1] - a[1]);
  const visibleEntries = sortedEntries.slice(0, 4);
  const hiddenCount = sortedEntries.length - 4;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Asset Allocation</h3>
      </div>

      <div className="space-y-3">
        {visibleEntries.map(([name, value]) => {
          const percentage = total > 0 ? (value / total) * 100 : 0;
          const color = COLORS[name] || "bg-gray-400";

          return (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <span>{name}</span>
                </div>
                <span className="font-medium">{percentage.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          +{hiddenCount} more categories
        </p>
      )}
    </Card>
  );
}
