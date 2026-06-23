import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AlertCircle, Bell, BellOff, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
}

interface BudgetAlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
}

interface AlertSettings {
  enabled: boolean;
  threshold75: boolean;
  threshold90: boolean;
  threshold100: boolean;
  customThreshold: number;
  customEnabled: boolean;
}

const STORAGE_KEY = "coinsbloom_budget_alerts";

export function BudgetAlertsModal({ open, onOpenChange, budgets }: BudgetAlertsModalProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    threshold75: true,
    threshold90: true,
    threshold100: true,
    customThreshold: 50,
    customEnabled: false,
  });

  // Load settings from localStorage and database
  useEffect(() => {
    const loadSettings = async () => {
      // First check localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch {
          // Keep defaults
        }
      }

      // Then sync from database if user is logged in
      if (user) {
        const { data } = await supabase
          .from("budget_alert_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data) {
          const dbSettings = {
            enabled: data.enabled,
            threshold75: data.threshold_75,
            threshold90: data.threshold_90,
            threshold100: data.threshold_100,
            customThreshold: data.custom_threshold,
            customEnabled: data.custom_enabled,
          };
          setSettings(dbSettings);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(dbSettings));
        }
      }
    };

    loadSettings();
  }, [user]);

  // Save settings to localStorage and database
  const saveSettings = async (newSettings: AlertSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));

    // Sync to database
    if (user) {
      await supabase
        .from("budget_alert_settings")
        .upsert({
          user_id: user.id,
          enabled: newSettings.enabled,
          threshold_75: newSettings.threshold75,
          threshold_90: newSettings.threshold90,
          threshold_100: newSettings.threshold100,
          custom_threshold: newSettings.customThreshold,
          custom_enabled: newSettings.customEnabled,
        }, { onConflict: "user_id" });
    }
  };

  // Calculate active alerts
  const getActiveAlerts = () => {
    if (!settings.enabled) return [];
    
    const alerts: { budget: Budget; level: string; percent: number }[] = [];
    
    budgets.forEach(budget => {
      const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
      
      if (settings.threshold100 && percent >= 100) {
        alerts.push({ budget, level: "over", percent });
      } else if (settings.threshold90 && percent >= 90) {
        alerts.push({ budget, level: "critical", percent });
      } else if (settings.threshold75 && percent >= 75) {
        alerts.push({ budget, level: "warning", percent });
      } else if (settings.customEnabled && percent >= settings.customThreshold) {
        alerts.push({ budget, level: "custom", percent });
      }
    });
    
    return alerts.sort((a, b) => b.percent - a.percent);
  };

  const activeAlerts = getActiveAlerts();

  const getAlertColor = (level: string) => {
    switch (level) {
      case "over": return "border-l-red-500 bg-red-500/10";
      case "critical": return "border-l-orange-500 bg-orange-500/10";
      case "warning": return "border-l-yellow-500 bg-yellow-500/10";
      default: return "border-l-blue-500 bg-blue-500/10";
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case "over": return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "critical": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "warning": return <TrendingUp className="h-5 w-5 text-yellow-500" />;
      default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const handleToggleAll = (enabled: boolean) => {
    saveSettings({ ...settings, enabled });
    if (enabled) {
      toast.success("Budget alerts enabled");
    } else {
      toast.info("Budget alerts disabled");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Budget Alerts
          </DialogTitle>
        </DialogHeader>

        {/* Master Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.enabled ? (
                  <Bell className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Budget Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.enabled ? "Receiving alerts" : "Alerts disabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={handleToggleAll}
              />
            </div>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Alert Thresholds</h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Over budget (100%+)</span>
              </div>
              <Switch
                checked={settings.threshold100}
                onCheckedChange={(v) => saveSettings({ ...settings, threshold100: v })}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm">Critical (90%)</span>
              </div>
              <Switch
                checked={settings.threshold90}
                onCheckedChange={(v) => saveSettings({ ...settings, threshold90: v })}
                disabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Warning (75%)</span>
              </div>
              <Switch
                checked={settings.threshold75}
                onCheckedChange={(v) => saveSettings({ ...settings, threshold75: v })}
                disabled={!settings.enabled}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Custom ({settings.customThreshold}%)</span>
                </div>
                <Switch
                  checked={settings.customEnabled}
                  onCheckedChange={(v) => saveSettings({ ...settings, customEnabled: v })}
                  disabled={!settings.enabled}
                />
              </div>
              {settings.customEnabled && (
                <Slider
                  value={[settings.customThreshold]}
                  onValueChange={([v]) => saveSettings({ ...settings, customThreshold: v })}
                  min={10}
                  max={95}
                  step={5}
                  disabled={!settings.enabled}
                />
              )}
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">
            Active Alerts ({activeAlerts.length})
          </h3>
          
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  All budgets are within limits
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((alert, index) => (
                <Card key={index} className={`border-l-4 ${getAlertColor(alert.level)}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {getAlertIcon(alert.level)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.budget.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${alert.budget.spent.toLocaleString()} of ${alert.budget.amount.toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${
                        alert.level === "over" ? "text-red-500" : 
                        alert.level === "critical" ? "text-orange-500" : 
                        "text-yellow-500"
                      }`}>
                        {alert.percent.toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
