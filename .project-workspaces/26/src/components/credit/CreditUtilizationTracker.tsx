import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  Download,
  RefreshCw,
  Pencil,
  Bell,
  BellOff,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreditAccount {
  id: string;
  name: string;
  credit_limit: number;
  current_balance: number;
  last_updated: string;
  is_from_plaid?: boolean;
  plaid_account_id?: string;
}

interface PlaidCreditAccount {
  id: string;
  name: string;
  balance: number;
  institution: string | null;
  plaid_account_id: string | null;
}

interface UtilizationAlert {
  accountId: string;
  accountName: string;
  utilization: number;
  threshold: number;
  type: 'warning' | 'critical';
}

export const CreditUtilizationTracker = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [plaidCreditAccounts, setPlaidCreditAccounts] = useState<PlaidCreditAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", creditLimit: "", currentBalance: "" });
  const [editingLimitId, setEditingLimitId] = useState<string | null>(null);
  const [editLimitValue, setEditLimitValue] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem('credit_utilization_alerts') !== 'false';
  });
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const fetchAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load credit accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaidCreditAccounts = async () => {
    if (!user) return;
    
    try {
      // Fetch linked credit card accounts from Plaid
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, balance, institution, plaid_account_id')
        .eq('user_id', user.id)
        .eq('account_type', 'credit_card')
        .eq('is_manual', false)
        .not('plaid_account_id', 'is', null);

      if (error) throw error;
      setPlaidCreditAccounts(data || []);
    } catch (error) {
      console.error('Error fetching Plaid credit accounts:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchPlaidCreditAccounts();
  }, [user]);

  const totalCreditLimit = accounts.reduce((sum, acc) => sum + Number(acc.credit_limit), 0);
  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const overallUtilization = totalCreditLimit > 0 ? (totalBalance / totalCreditLimit) * 100 : 0;

  const getUtilizationColor = (utilization: number) => {
    if (utilization <= 10) return "text-emerald-400";
    if (utilization <= 30) return "text-emerald-400";
    if (utilization <= 50) return "text-amber-400";
    if (utilization <= 75) return "text-orange-400";
    return "text-rose-400";
  };

  const getUtilizationBg = (utilization: number) => {
    if (utilization <= 10) return "bg-emerald-500";
    if (utilization <= 30) return "bg-emerald-500";
    if (utilization <= 50) return "bg-amber-500";
    if (utilization <= 75) return "bg-orange-500";
    return "bg-rose-500";
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization <= 10) return { label: "Excellent", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400" };
    if (utilization <= 30) return { label: "Good", icon: CheckCircle, color: "bg-emerald-500/20 text-emerald-400" };
    if (utilization <= 50) return { label: "Fair", icon: Info, color: "bg-amber-500/20 text-amber-400" };
    if (utilization <= 75) return { label: "High", icon: AlertTriangle, color: "bg-orange-500/20 text-orange-400" };
    return { label: "Critical", icon: AlertTriangle, color: "bg-rose-500/20 text-rose-400" };
  };

  const handleAddAccount = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!newAccount.name || !newAccount.creditLimit) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('credit_accounts').insert({
        user_id: user.id,
        name: newAccount.name,
        credit_limit: parseFloat(newAccount.creditLimit),
        current_balance: parseFloat(newAccount.currentBalance) || 0,
      });

      if (error) throw error;

      toast.success("Account added successfully");
      setNewAccount({ name: "", creditLimit: "", currentBalance: "" });
      setIsAddModalOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFromPlaid = async (plaidAccount: PlaidCreditAccount, creditLimit: number) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    // Check if already imported
    const alreadyImported = accounts.some(acc => acc.plaid_account_id === plaidAccount.plaid_account_id);
    if (alreadyImported) {
      toast.error('This account is already imported');
      return;
    }

    setIsImporting(true);
    try {
      const { error } = await supabase.from('credit_accounts').insert({
        user_id: user.id,
        name: plaidAccount.name,
        credit_limit: creditLimit,
        current_balance: plaidAccount.balance,
      });

      if (error) throw error;

      toast.success(`Imported ${plaidAccount.name}`);
      fetchAccounts();
    } catch (error) {
      console.error('Error importing account:', error);
      toast.error('Failed to import account');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSyncFromPlaid = async () => {
    if (!user) return;
    
    setIsImporting(true);
    try {
      // Trigger Plaid sync first
      await supabase.functions.invoke('plaid', {
        body: { action: 'sync_accounts' }
      });

      // Refresh Plaid accounts
      await fetchPlaidCreditAccounts();
      
      // Update balances for any imported accounts
      for (const account of accounts) {
        const plaidAccount = plaidCreditAccounts.find(p => p.name === account.name);
        if (plaidAccount) {
          await supabase
            .from('credit_accounts')
            .update({ 
              current_balance: plaidAccount.balance,
              last_updated: new Date().toISOString()
            })
            .eq('id', account.id);
        }
      }

      fetchAccounts();
      toast.success('Synced balances from linked banks');
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Failed to sync balances');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('credit_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Account removed");
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleUpdateBalance = async (id: string, newBalance: number) => {
    try {
      const { error } = await supabase
        .from('credit_accounts')
        .update({ 
          current_balance: newBalance,
          last_updated: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setAccounts(accounts.map(acc => 
        acc.id === id 
          ? { ...acc, current_balance: newBalance, last_updated: new Date().toISOString() }
          : acc
      ));
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    }
  };

  const handleUpdateCreditLimit = async (id: string) => {
    const newLimit = parseFloat(editLimitValue);
    if (!newLimit || newLimit <= 0) {
      toast.error('Please enter a valid credit limit');
      return;
    }

    try {
      const { error } = await supabase
        .from('credit_accounts')
        .update({ 
          credit_limit: newLimit,
          last_updated: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setAccounts(accounts.map(acc => 
        acc.id === id 
          ? { ...acc, credit_limit: newLimit, last_updated: new Date().toISOString() }
          : acc
      ));
      setEditingLimitId(null);
      setEditLimitValue("");
      toast.success('Credit limit updated');
    } catch (error) {
      console.error('Error updating credit limit:', error);
      toast.error('Failed to update credit limit');
    }
  };

  const toggleAlerts = (enabled: boolean) => {
    setAlertsEnabled(enabled);
    localStorage.setItem('credit_utilization_alerts', String(enabled));
    toast.success(enabled ? 'Utilization alerts enabled' : 'Utilization alerts disabled');
  };

  const dismissAlert = (alertKey: string) => {
    setDismissedAlerts(prev => [...prev, alertKey]);
  };

  // Calculate utilization alerts
  const utilizationAlerts: UtilizationAlert[] = alertsEnabled ? accounts
    .map(account => {
      const utilization = (Number(account.current_balance) / Number(account.credit_limit)) * 100;
      const alertKey = `${account.id}-${utilization > 50 ? 'critical' : 'warning'}`;
      
      if (dismissedAlerts.includes(alertKey)) return null;
      
      if (utilization > 50) {
        return {
          accountId: account.id,
          accountName: account.name,
          utilization,
          threshold: 50,
          type: 'critical' as const
        };
      } else if (utilization > 30) {
        return {
          accountId: account.id,
          accountName: account.name,
          utilization,
          threshold: 30,
          type: 'warning' as const
        };
      }
      return null;
    })
    .filter((alert): alert is UtilizationAlert => alert !== null) : [];

  const status = getUtilizationStatus(overallUtilization);
  const StatusIcon = status.icon;

  const idealPayment = totalBalance > totalCreditLimit * 0.3 
    ? totalBalance - (totalCreditLimit * 0.3) 
    : 0;

  // Filter out already imported accounts
  const availableToImport = plaidCreditAccounts.filter(
    plaid => !accounts.some(acc => acc.name === plaid.name)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Utilization Alerts */}
      <AnimatePresence>
        {utilizationAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {utilizationAlerts.map((alert) => (
              <motion.div
                key={`${alert.accountId}-${alert.type}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-4 rounded-lg border flex items-center justify-between ${
                  alert.type === 'critical' 
                    ? 'bg-rose-500/10 border-rose-500/30' 
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400'
                  }`} />
                  <div>
                    <p className="font-medium">
                      {alert.type === 'critical' ? 'High Utilization Alert' : 'Utilization Warning'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{alert.accountName}</span> is at{' '}
                      <span className={alert.type === 'critical' ? 'text-rose-400' : 'text-amber-400'}>
                        {alert.utilization.toFixed(0)}%
                      </span>{' '}
                      utilization (above {alert.threshold}% threshold)
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissAlert(`${alert.accountId}-${alert.type}`)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall Utilization Card */}
      <Card className="bg-gradient-to-br from-card to-card/80 border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">Overall Credit Utilization</h3>
                {accounts.length > 0 && (
                  <Badge className={status.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-baseline gap-2 mb-4">
                <span className={`text-5xl font-bold ${getUtilizationColor(overallUtilization)}`}>
                  {overallUtilization.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">of ${totalCreditLimit.toLocaleString()}</span>
              </div>

              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`absolute left-0 top-0 h-full ${getUtilizationBg(overallUtilization)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(overallUtilization, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                {/* Threshold markers */}
                <div className="absolute left-[30%] top-0 h-full w-0.5 bg-muted-foreground/30" />
                <div className="absolute left-[50%] top-0 h-full w-0.5 bg-muted-foreground/30" />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>30% (Ideal)</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:min-w-[280px]">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-rose-400">${totalBalance.toLocaleString()}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${(totalCreditLimit - totalBalance).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {idealPayment > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-amber-400" />
                <span className="font-medium">Recommendation:</span>
                <span className="text-muted-foreground">
                  Pay <span className="text-amber-400 font-semibold">${idealPayment.toLocaleString()}</span> to reach the ideal 30% utilization
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Individual Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Accounts
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Alert Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              {alertsEnabled ? (
                <Bell className="h-4 w-4 text-primary" />
              ) : (
                <BellOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">Alerts</span>
              <Switch
                checked={alertsEnabled}
                onCheckedChange={toggleAlerts}
                className="scale-75"
              />
            </div>

            {plaidCreditAccounts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncFromPlaid}
                disabled={isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>
            )}
            
            {availableToImport.length > 0 && (
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Import ({availableToImport.length})
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import from Linked Banks</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Import credit card accounts from your linked bank connections. You'll need to enter the credit limit for each card.
                    </p>
                    {availableToImport.map((plaidAccount) => (
                      <ImportAccountItem
                        key={plaidAccount.id}
                        account={plaidAccount}
                        onImport={handleImportFromPlaid}
                        isImporting={isImporting}
                      />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Credit Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Account Name</Label>
                    <Input
                      id="name"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      placeholder="e.g., Chase Freedom"
                    />
                  </div>
                  <div>
                    <Label htmlFor="limit">Credit Limit</Label>
                    <Input
                      id="limit"
                      type="number"
                      value={newAccount.creditLimit}
                      onChange={(e) => setNewAccount({ ...newAccount, creditLimit: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="balance">Current Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      value={newAccount.currentBalance}
                      onChange={(e) => setNewAccount({ ...newAccount, currentBalance: e.target.value })}
                      placeholder="1200"
                    />
                  </div>
                  <Button 
                    onClick={handleAddAccount} 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Account'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => {
              const utilization = (Number(account.current_balance) / Number(account.credit_limit)) * 100;
              const accountStatus = getUtilizationStatus(utilization);
              const isEditingLimit = editingLimitId === account.id;
              
              return (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{account.name}</h4>
                        <Badge variant="outline" className={accountStatus.color}>
                          {utilization.toFixed(0)}%
                        </Badge>
                        {utilization > 30 && alertsEnabled && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {utilization > 50 ? 'High' : 'Watch'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>${Number(account.current_balance).toLocaleString()} of </span>
                        {isEditingLimit ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editLimitValue}
                              onChange={(e) => setEditLimitValue(e.target.value)}
                              className="w-24 h-6 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCreditLimit(account.id);
                                if (e.key === 'Escape') {
                                  setEditingLimitId(null);
                                  setEditLimitValue("");
                                }
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleUpdateCreditLimit(account.id)}
                            >
                              <CheckCircle className="h-3 w-3 text-emerald-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingLimitId(null);
                                setEditLimitValue("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingLimitId(account.id);
                              setEditLimitValue(String(account.credit_limit));
                            }}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <span>${Number(account.credit_limit).toLocaleString()}</span>
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                      className="text-muted-foreground hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute left-0 top-0 h-full ${getUtilizationBg(utilization)} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(utilization, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      value={account.current_balance}
                      onChange={(e) => handleUpdateBalance(account.id, parseFloat(e.target.value) || 0)}
                      className="w-32 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">Update balance</span>
                  </div>
                </motion.div>
              );
            })}

            {accounts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No credit accounts added yet</p>
                <p className="text-sm mb-4">Add your first account to start tracking</p>
                {availableToImport.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsImportModalOpen(true)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Import from Linked Banks ({availableToImport.length} available)
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Credit Utilization Tips
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Keep your overall utilization below 30% for the best impact on your credit score</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Individual card utilization also matters - try to keep each card under 30%</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Pay your balance before the statement date to report lower utilization</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Request credit limit increases to lower your utilization ratio</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Sub-component for importing individual accounts
interface ImportAccountItemProps {
  account: PlaidCreditAccount;
  onImport: (account: PlaidCreditAccount, creditLimit: number) => void;
  isImporting: boolean;
}

const ImportAccountItem = ({ account, onImport, isImporting }: ImportAccountItemProps) => {
  const [creditLimit, setCreditLimit] = useState('');
  
  const handleImport = () => {
    const limit = parseFloat(creditLimit);
    if (!limit || limit <= 0) {
      toast.error('Please enter a valid credit limit');
      return;
    }
    onImport(account, limit);
  };

  return (
    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{account.name}</p>
          <p className="text-sm text-muted-foreground">
            {account.institution} • Balance: ${account.balance.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label htmlFor={`limit-${account.id}`} className="text-xs">Credit Limit</Label>
          <Input
            id={`limit-${account.id}`}
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="Enter credit limit"
            className="h-9"
          />
        </div>
        <Button 
          onClick={handleImport}
          disabled={isImporting || !creditLimit}
          className="mt-5"
          size="sm"
        >
          {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
        </Button>
      </div>
    </div>
  );
};
