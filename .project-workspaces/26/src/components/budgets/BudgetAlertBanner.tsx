import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, AlertTriangle, TrendingUp, X, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
}

interface BudgetAlert {
  id: string;
  budget_id: string;
  alert_type: string;
  threshold_percent: number;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface BudgetAlertBannerProps {
  budgets: Budget[];
  compact?: boolean;
}

export const BudgetAlertBanner = ({ budgets, compact = false }: BudgetAlertBannerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<{ budget: Budget; type: string; percent: number }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState({
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
      // First check localStorage for immediate response
      const saved = localStorage.getItem("coinsbloom_budget_alerts");
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch {
          // Use defaults
        }
      }

      // Then check database for persisted settings
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
          // Sync to localStorage
          localStorage.setItem("coinsbloom_budget_alerts", JSON.stringify(dbSettings));
        }
      }
    };

    loadSettings();
  }, [user]);

  // Calculate active alerts based on budgets and settings
  useEffect(() => {
    if (!settings.enabled) {
      setAlerts([]);
      return;
    }

    const activeAlerts: { budget: Budget; type: string; percent: number }[] = [];

    budgets.forEach((budget) => {
      const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;

      // Only add alert if not dismissed
      const alertKey = `${budget.id}-${Math.floor(percent / 10) * 10}`;
      if (dismissed.has(alertKey)) return;

      if (settings.threshold100 && percent >= 100) {
        activeAlerts.push({ budget, type: "over", percent });
      } else if (settings.threshold90 && percent >= 90) {
        activeAlerts.push({ budget, type: "critical", percent });
      } else if (settings.threshold75 && percent >= 75) {
        activeAlerts.push({ budget, type: "warning", percent });
      } else if (settings.customEnabled && percent >= settings.customThreshold) {
        activeAlerts.push({ budget, type: "custom", percent });
      }
    });

    setAlerts(activeAlerts.sort((a, b) => b.percent - a.percent));
  }, [budgets, settings, dismissed]);

  const handleDismiss = (budget: Budget, percent: number) => {
    const alertKey = `${budget.id}-${Math.floor(percent / 10) * 10}`;
    setDismissed((prev) => new Set([...prev, alertKey]));
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case "over":
        return {
          bg: "bg-destructive/10 dark:bg-destructive/5 border-destructive/30",
          icon: <AlertCircle className="h-5 w-5 text-destructive" />,
          text: "text-destructive",
        };
      case "critical":
        return {
          bg: "bg-orange-500/10 dark:bg-orange-500/5 border-orange-500/30",
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          text: "text-orange-500",
        };
      case "warning":
        return {
          bg: "bg-yellow-500/10 dark:bg-yellow-500/5 border-yellow-500/30",
          icon: <TrendingUp className="h-5 w-5 text-yellow-500" />,
          text: "text-yellow-600 dark:text-yellow-400",
        };
      default:
        return {
          bg: "bg-primary/10 dark:bg-primary/5 border-primary/30",
          icon: <Bell className="h-5 w-5 text-primary" />,
          text: "text-primary",
        };
    }
  };

  if (alerts.length === 0) return null;

  // Compact mode for dashboard
  if (compact) {
    const topAlert = alerts[0];
    const styles = getAlertStyles(topAlert.type);

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-3 border ${styles.bg} cursor-pointer`}
        onClick={() => navigate("/budgets")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {styles.icon}
            <div>
              <p className={`text-sm font-medium ${styles.text}`}>
                {alerts.length} Budget Alert{alerts.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {topAlert.budget.name} at {topAlert.percent.toFixed(0)}%
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 3).map((alert) => {
          const styles = getAlertStyles(alert.type);

          return (
            <motion.div
              key={`${alert.budget.id}-${alert.type}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              layout
            >
              <Card className={`border ${styles.bg}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {styles.icon}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${styles.text} truncate`}>
                        {alert.budget.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${alert.budget.spent.toLocaleString()} of $
                        {alert.budget.amount.toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${styles.text}`}>
                      {alert.percent.toFixed(0)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(alert.budget, alert.percent);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {alerts.length > 3 && (
        <Button
          variant="ghost"
          className="w-full text-sm text-muted-foreground"
          onClick={() => navigate("/budgets")}
        >
          View {alerts.length - 3} more alert{alerts.length - 3 > 1 ? "s" : ""}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
};
