import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, AlertTriangle, Calendar, Clock, CheckCircle2, Settings, Zap, TrendingDown } from "lucide-react";
import { format, isBefore, addDays, isToday, isTomorrow, startOfToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
  is_autopay: boolean;
}

interface SmartAlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: Bill[];
  onRefresh: () => void;
}

const SmartAlertsModal = ({ open, onOpenChange, bills, onRefresh }: SmartAlertsModalProps) => {
  const { user } = useAuth();
  const [updating, setUpdating] = useState<string | null>(null);
  const [variableReviewEnabled, setVariableReviewEnabled] = useState(true);
  const [variableReviewDay, setVariableReviewDay] = useState("1");
  const [savingSettings, setSavingSettings] = useState(false);
  const today = startOfToday();

  // Load user settings
  useEffect(() => {
    if (open && user) {
      loadSettings();
    }
  }, [open, user]);

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('variable_review_enabled, variable_review_day')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setVariableReviewEnabled(data.variable_review_enabled ?? true);
      setVariableReviewDay((data.variable_review_day ?? 1).toString());
    }
  };

  const saveVariableSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        variable_review_enabled: variableReviewEnabled,
        variable_review_day: parseInt(variableReviewDay)
      })
      .eq('id', user.id);
    
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Variable review settings saved');
    }
    setSavingSettings(false);
  };

  // Categorize alerts
  const overdue = bills.filter(b => b.status !== 'paid' && isBefore(new Date(b.due_date), today));
  const dueToday = bills.filter(b => b.status !== 'paid' && isToday(new Date(b.due_date)));
  const dueTomorrow = bills.filter(b => b.status !== 'paid' && isTomorrow(new Date(b.due_date)));
  const dueThisWeek = bills.filter(b => {
    const dueDate = new Date(b.due_date);
    return b.status !== 'paid' && 
           !isToday(dueDate) && 
           !isTomorrow(dueDate) && 
           !isBefore(dueDate, today) &&
           isBefore(dueDate, addDays(today, 7));
  });

  const toggleReminder = async (bill: Bill) => {
    setUpdating(bill.id);
    try {
      const { error } = await supabase
        .from('bills')
        .update({ reminder_enabled: !bill.reminder_enabled })
        .eq('id', bill.id);

      if (error) throw error;
      toast.success(bill.reminder_enabled ? 'Reminder disabled' : 'Reminder enabled');
      onRefresh();
    } catch (error) {
      toast.error('Failed to update reminder');
    } finally {
      setUpdating(null);
    }
  };

  const AlertSection = ({ title, icon: Icon, bills, variant }: { 
    title: string; 
    icon: any; 
    bills: Bill[]; 
    variant: 'danger' | 'warning' | 'info' 
  }) => {
    if (bills.length === 0) return null;

    const bgColor = variant === 'danger' ? 'bg-destructive/10' : 
                    variant === 'warning' ? 'bg-orange-500/10' : 'bg-blue-500/10';
    const textColor = variant === 'danger' ? 'text-destructive' : 
                      variant === 'warning' ? 'text-orange-500' : 'text-blue-500';

    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${textColor}`} />
          <span className={`font-semibold ${textColor}`}>{title}</span>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${bgColor} ${textColor}`}>
            {bills.length}
          </span>
        </div>
        {bills.map(bill => (
          <Card key={bill.id} className="border-l-4" style={{ borderLeftColor: variant === 'danger' ? 'hsl(var(--destructive))' : variant === 'warning' ? '#f97316' : '#3b82f6' }}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{bill.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${Number(bill.amount).toFixed(2)} • Due {format(new Date(bill.due_date), 'MMM d')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {bill.is_autopay && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    Autopay
                  </span>
                )}
                <Switch
                  checked={bill.reminder_enabled}
                  onCheckedChange={() => toggleReminder(bill)}
                  disabled={updating === bill.id}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const billsWithReminders = bills.filter(b => b.reminder_enabled && b.status !== 'paid');
  const billsWithoutReminders = bills.filter(b => !b.reminder_enabled && b.status !== 'paid');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Smart Alerts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-emerald-50 dark:bg-emerald-900/20">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold text-emerald-600">{billsWithReminders.length}</p>
                <p className="text-xs text-muted-foreground">Alerts Active</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-3 text-center">
                <Bell className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                <p className="text-lg font-bold text-orange-600">{billsWithoutReminders.length}</p>
                <p className="text-xs text-muted-foreground">No Alerts</p>
              </CardContent>
            </Card>
          </div>

          {/* Alert Sections */}
          <AlertSection title="Overdue" icon={AlertTriangle} bills={overdue} variant="danger" />
          <AlertSection title="Due Today" icon={Zap} bills={dueToday} variant="danger" />
          <AlertSection title="Due Tomorrow" icon={Clock} bills={dueTomorrow} variant="warning" />
          <AlertSection title="Due This Week" icon={Calendar} bills={dueThisWeek} variant="info" />

          {/* No Alerts Info */}
          {billsWithoutReminders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Bills without reminders:
              </p>
              {billsWithoutReminders.slice(0, 5).map(bill => (
                <div key={bill.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-sm">{bill.name}</span>
                  <Switch
                    checked={bill.reminder_enabled}
                    onCheckedChange={() => toggleReminder(bill)}
                    disabled={updating === bill.id}
                  />
                </div>
              ))}
              {billsWithoutReminders.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{billsWithoutReminders.length - 5} more bills
                </p>
              )}
            </div>
          )}

          {/* Empty State */}
          {bills.filter(b => b.status !== 'paid').length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>All bills are paid! You're all caught up.</p>
            </div>
          )}

          {/* Variable Bill Review Settings */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className="font-semibold">Monthly Variable Review</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Get a monthly reminder to review and update variable bill amounts (utilities, credit cards, etc.)
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Enable monthly reminder</span>
                <Switch
                  checked={variableReviewEnabled}
                  onCheckedChange={setVariableReviewEnabled}
                />
              </div>
              {variableReviewEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Review day of month</span>
                  <Select value={variableReviewDay} onValueChange={setVariableReviewDay}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button 
                onClick={saveVariableSettings} 
                disabled={savingSettings}
                size="sm"
                className="w-full"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartAlertsModal;
