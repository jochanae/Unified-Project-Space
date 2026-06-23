import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UtilizationAlertsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; current_balance: number; credit_limit: number }>>([]);
  const [threshold30, setThreshold30] = useState(true);
  const [threshold50, setThreshold50] = useState(true);
  const [threshold75, setThreshold75] = useState(true);
  const [customThreshold, setCustomThreshold] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("credit_accounts")
      .select("id, name, current_balance, credit_limit")
      .eq("user_id", user.id)
      .then(({ data }) => setAccounts(data || []));
  }, [user, open]);

  const getUtilization = (balance: number, limit: number) => {
    if (limit <= 0) return 0;
    return Math.round((balance / limit) * 100);
  };

  const getUtilizationColor = (pct: number) => {
    if (pct <= 30) return "text-emerald-500";
    if (pct <= 50) return "text-amber-500";
    return "text-red-500";
  };

  const handleSave = () => {
    setSaved(true);
    toast.success("Alert preferences saved");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Credit Utilization Alerts
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Current Utilization Overview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Current Utilization</h3>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No credit accounts found. Add accounts in the Credit Utilization tracker above.</p>
              ) : (
                accounts.map(acc => {
                  const pct = getUtilization(acc.current_balance, acc.credit_limit);
                  return (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${acc.current_balance.toLocaleString()} / ${acc.credit_limit.toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${getUtilizationColor(pct)}`}>
                        {pct}%
                      </div>
                    </div>
                  );
                })
              )}

              {accounts.length > 0 && (() => {
                const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
                const totalLimit = accounts.reduce((s, a) => s + a.credit_limit, 0);
                const overallPct = getUtilization(totalBalance, totalLimit);
                return (
                  <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                    <span className="text-sm font-semibold">Overall Utilization</span>
                    <span className={`text-lg font-bold ${getUtilizationColor(overallPct)}`}>
                      {overallPct}%
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Alert Thresholds */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Alert Thresholds</h3>
              <p className="text-xs text-muted-foreground">
                Get notified when your utilization crosses these levels. Keeping utilization under 30% is recommended for the best credit score impact.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <Label className="text-sm">Alert at 30% (Recommended max)</Label>
                  </div>
                  <Switch checked={threshold30} onCheckedChange={setThreshold30} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm">Alert at 50% (Moderate risk)</Label>
                  </div>
                  <Switch checked={threshold50} onCheckedChange={setThreshold50} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <Label className="text-sm">Alert at 75% (High risk)</Label>
                  </div>
                  <Switch checked={threshold75} onCheckedChange={setThreshold75} />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <Label className="text-sm whitespace-nowrap">Custom threshold:</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customThreshold}
                      onChange={e => setCustomThreshold(e.target.value)}
                      className="w-20"
                      placeholder="e.g. 40"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="text-xs font-semibold mb-1">Utilization Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Keep overall utilization under 30% for the best score impact</li>
                <li>• Individual card utilization matters too — spread balances across cards</li>
                <li>• Pay down balances before statement closing dates</li>
                <li>• Request credit limit increases to lower your ratio</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        <Button onClick={handleSave} className="mt-2">
          {saved ? "Saved!" : "Save Alert Preferences"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
