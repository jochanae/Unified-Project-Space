import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";

interface CustomDateRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (startDate: Date, endDate: Date) => void;
}

const CustomDateRangeModal = ({ open, onOpenChange, onApply }: CustomDateRangeModalProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  const presets = [
    { label: "This Month", start: startOfMonth(new Date()), end: endOfMonth(new Date()) },
    { label: "Last Month", start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
    { label: "Last 30 Days", start: subDays(new Date(), 30), end: new Date() },
    { label: "Last 90 Days", start: subDays(new Date(), 90), end: new Date() },
    { label: "Year to Date", start: startOfYear(new Date()), end: new Date() },
    { label: "Last 6 Months", start: startOfMonth(subMonths(new Date(), 5)), end: endOfMonth(new Date()) },
  ];

  const handlePreset = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Custom Date Range
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset(preset.start, preset.end)}
                  className={cn(
                    startDate?.getTime() === preset.start.getTime() &&
                    endDate?.getTime() === preset.end.getTime() &&
                    "bg-primary text-primary-foreground"
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Selection */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => endDate ? date > endDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Selected Range Display */}
          {startDate && endDate && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-center">
              <span className="font-medium">Selected Range:</span>{" "}
              {format(startDate, "MMM d, yyyy")} – {format(endDate, "MMM d, yyyy")}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!startDate || !endDate}>
            Apply Range
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDateRangeModal;
