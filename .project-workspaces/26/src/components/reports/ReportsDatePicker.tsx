import { ChevronLeft, ChevronRight, Calendar, FileText, Download, Sparkles, GitCompare, Clock, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";

interface ReportsDatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  onAIInsights?: () => void;
  onCompare?: () => void;
  onSchedule?: () => void;
  onCustomDate?: () => void;
  onShare?: () => void;
  customDateRange?: { start: Date; end: Date } | null;
}

const ReportsDatePicker = ({ 
  selectedDate, 
  onDateChange,
  onExportPDF,
  onExportCSV,
  onAIInsights,
  onCompare,
  onSchedule,
  onCustomDate,
  onShare,
  customDateRange
}: ReportsDatePickerProps) => {
  const handlePrevMonth = () => onDateChange(subMonths(selectedDate, 1));
  const handleNextMonth = () => onDateChange(addMonths(selectedDate, 1));
  const handleToday = () => onDateChange(new Date());

  return (
    <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted border border-border/50 shadow-sm space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="hover:bg-primary/10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-foreground">
            {customDateRange 
              ? `${format(customDateRange.start, "MMM d")} - ${format(customDateRange.end, "MMM d, yyyy")}`
              : format(selectedDate, "MMMM yyyy")
            }
          </span>
        </div>
        
        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-primary/10">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleToday} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <Calendar className="w-4 h-4 mr-1 text-primary" />
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={onCustomDate} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <Calendar className="w-4 h-4 mr-1 text-primary" />
          Custom Date
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPDF} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <FileText className="w-4 h-4 mr-1 text-emerald-500" />
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onExportCSV} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <Download className="w-4 h-4 mr-1 text-blue-500" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onAIInsights} className="bg-background/80 hover:bg-purple-500/10 hover:border-purple-500/30">
          <Sparkles className="w-4 h-4 mr-1 text-purple-500" />
          AI Insights
        </Button>
        <Button variant="outline" size="sm" onClick={onCompare} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <GitCompare className="w-4 h-4 mr-1 text-teal-500" />
          Compare
        </Button>
        <Button variant="outline" size="sm" onClick={onSchedule} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <Clock className="w-4 h-4 mr-1 text-amber-500" />
          Schedule
        </Button>
        <Button variant="outline" size="sm" onClick={onShare} className="bg-background/80 hover:bg-primary/10 hover:border-primary/30">
          <Share2 className="w-4 h-4 mr-1 text-pink-500" />
          Share
        </Button>
      </div>
    </div>
  );
};

export default ReportsDatePicker;
