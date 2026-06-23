import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Repeat } from "lucide-react";
import { addDays, addWeeks, addMonths, addYears, format } from "date-fns";

export type RecurrencePattern = 
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | null;

interface RecurrencePatternSelectProps {
  value: RecurrencePattern;
  onChange: (value: RecurrencePattern) => void;
  transactionDate: string;
  disabled?: boolean;
}

const patterns = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 Months" },
  { value: "yearly", label: "Yearly" },
];

export const calculateNextDate = (
  startDate: string,
  pattern: RecurrencePattern
): string | null => {
  if (!pattern) return null;
  
  const date = new Date(startDate);
  
  switch (pattern) {
    case "daily":
      return format(addDays(date, 1), "yyyy-MM-dd");
    case "weekly":
      return format(addWeeks(date, 1), "yyyy-MM-dd");
    case "biweekly":
      return format(addWeeks(date, 2), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(date, 1), "yyyy-MM-dd");
    case "quarterly":
      return format(addMonths(date, 3), "yyyy-MM-dd");
    case "yearly":
      return format(addYears(date, 1), "yyyy-MM-dd");
    default:
      return null;
  }
};

export const getPatternLabel = (pattern: RecurrencePattern): string => {
  return patterns.find(p => p.value === pattern)?.label || "Unknown";
};

export const RecurrencePatternSelect = ({
  value,
  onChange,
  transactionDate,
  disabled = false,
}: RecurrencePatternSelectProps) => {
  const nextDate = calculateNextDate(transactionDate, value);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Repeat className="h-4 w-4" />
        Recurrence Pattern
      </Label>
      <Select
        value={value || "monthly"}
        onValueChange={(v) => onChange(v as RecurrencePattern)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          {patterns.map((pattern) => (
            <SelectItem key={pattern.value} value={pattern.value}>
              {pattern.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {nextDate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            Next: {format(new Date(nextDate), "MMM d, yyyy")}
          </span>
        </div>
      )}
    </div>
  );
};
