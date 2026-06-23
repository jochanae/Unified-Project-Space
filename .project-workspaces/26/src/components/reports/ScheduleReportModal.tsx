import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Clock, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ScheduleReportModal = ({ open, onOpenChange }: ScheduleReportModalProps) => {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<"weekly" | "monthly">("monthly");
  const [email, setEmail] = useState(user?.email || "");
  const [dayOfWeek, setDayOfWeek] = useState("1"); // Monday
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await supabase.functions.invoke("schedule-report", {
        body: {
          email,
          frequency,
          dayOfWeek: frequency === "weekly" ? parseInt(dayOfWeek) : null,
          dayOfMonth: frequency === "monthly" ? parseInt(dayOfMonth) : null,
          includeCharts,
          userId: user?.id,
        },
      });

      if (response.error) throw response.error;

      toast.success(`Report scheduled! You'll receive ${frequency} reports at ${email}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Schedule error:", error);
      toast.error("Failed to schedule report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Schedule Reports
          </DialogTitle>
          <DialogDescription>
            Receive automatic financial reports delivered to your email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Frequency
            </Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as "weekly" | "monthly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day Selection */}
          {frequency === "weekly" ? (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day === 1 ? "1st" : day === 2 ? "2nd" : day === 3 ? "3rd" : `${day}th`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Include Charts */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-charts">Include visual charts</Label>
            <Switch
              id="include-charts"
              checked={includeCharts}
              onCheckedChange={setIncludeCharts}
            />
          </div>

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <p>
              📊 Your report will include income, expenses, budget performance, and savings progress
              for the previous {frequency === "weekly" ? "week" : "month"}.
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isSubmitting}>
            {isSubmitting ? "Scheduling..." : "Schedule Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleReportModal;
