import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, DollarSign, Repeat, Edit2, Trash2, Gift, Sparkles, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SplitSettingsCard } from "./SplitSettingsCard";

interface AllowanceManagerProps {
  kidId: string;
  familyLinkId: string;
  kidName?: string;
}

interface Allowance {
  id: string;
  amount: number;
  frequency: string;
  next_payout_date: string;
  is_active: boolean;
  notes: string | null;
}

export const AllowanceManager = ({ kidId, familyLinkId, kidName = "Child" }: AllowanceManagerProps) => {
  const { user } = useAuth();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<Allowance | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newFrequency, setNewFrequency] = useState("weekly");
  const [giftAmount, setGiftAmount] = useState("");
  const [giftNote, setGiftNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllowances = async () => {
    const { data } = await supabase
      .from("kid_allowances")
      .select("*")
      .eq("kid_id", kidId)
      .order("created_at", { ascending: false });

    if (data) setAllowances(data);
  };

  useEffect(() => {
    fetchAllowances();
  }, [kidId]);

  const handleAddAllowance = async () => {
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      const nextDate = new Date();
      if (newFrequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (newFrequency === "biweekly") {
        nextDate.setDate(nextDate.getDate() + 14);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const { error } = await supabase
        .from("kid_allowances")
        .insert({
          kid_id: kidId,
          set_by: user?.id,
          amount,
          frequency: newFrequency,
          next_payout_date: nextDate.toISOString().split("T")[0],
        });

      if (error) throw error;

      toast.success("Allowance set up successfully!");
      setShowAddModal(false);
      setNewAmount("");
      setNewFrequency("weekly");
      fetchAllowances();
    } catch (error: any) {
      toast.error("Failed to set up allowance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAllowance = async () => {
    if (!selectedAllowance) return;
    
    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      const nextDate = new Date();
      if (newFrequency === "weekly") {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (newFrequency === "biweekly") {
        nextDate.setDate(nextDate.getDate() + 14);
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      const { error } = await supabase
        .from("kid_allowances")
        .update({
          amount,
          frequency: newFrequency,
          next_payout_date: nextDate.toISOString().split("T")[0],
        })
        .eq("id", selectedAllowance.id);

      if (error) throw error;

      toast.success("Allowance updated!");
      setShowEditModal(false);
      setSelectedAllowance(null);
      setNewAmount("");
      fetchAllowances();
    } catch (error: any) {
      toast.error("Failed to update allowance");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllowance = async () => {
    if (!selectedAllowance) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("kid_allowances")
        .delete()
        .eq("id", selectedAllowance.id);

      if (error) throw error;

      toast.success("Allowance deleted");
      setShowDeleteConfirm(false);
      setSelectedAllowance(null);
      fetchAllowances();
    } catch (error: any) {
      toast.error("Failed to delete allowance");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAllowance = async (allowance: Allowance) => {
    try {
      await supabase
        .from("kid_allowances")
        .update({ is_active: !allowance.is_active })
        .eq("id", allowance.id);

      fetchAllowances();
      toast.success(allowance.is_active ? "Allowance paused" : "Allowance resumed");
    } catch (error) {
      toast.error("Failed to update allowance");
    }
  };

  const openEditModal = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setNewAmount(allowance.amount.toString());
    setNewFrequency(allowance.frequency);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (allowance: Allowance) => {
    setSelectedAllowance(allowance);
    setShowDeleteConfirm(true);
  };

  const sendInstantMoney = async () => {
    const amount = parseFloat(giftAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      // Get profile with split percentages
      const { data: profile } = await supabase
        .from("kids_profiles")
        .select("spend_balance, save_balance, give_balance, total_earned, split_spend_percent, split_save_percent, split_give_percent")
        .eq("id", kidId)
        .single();

      if (profile) {
        // Calculate split amounts
        const spendPercent = profile.split_spend_percent ?? 100;
        const savePercent = profile.split_save_percent ?? 0;
        const givePercent = profile.split_give_percent ?? 0;
        
        const spendAmount = amount * (spendPercent / 100);
        const saveAmount = amount * (savePercent / 100);
        const giveAmount = amount * (givePercent / 100);

        // Add transaction with bucket info
        await supabase
          .from("kid_transactions")
          .insert({
            kid_id: kidId,
            type: "gift",
            amount,
            description: giftNote || "Gift from parent",
            bucket: "split",
          });

        // Update balances with split
        await supabase
          .from("kids_profiles")
          .update({
            spend_balance: (profile.spend_balance ?? 0) + spendAmount,
            save_balance: (profile.save_balance ?? 0) + saveAmount,
            give_balance: (profile.give_balance ?? 0) + giveAmount,
            total_earned: (profile.total_earned ?? 0) + amount,
          })
          .eq("id", kidId);
      }

      toast.success(`$${amount.toFixed(2)} sent to ${kidName}!`);
      setGiftAmount("");
      setGiftNote("");
    } catch (error) {
      toast.error("Failed to send money");
    } finally {
      setIsLoading(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "weekly": return "Weekly";
      case "biweekly": return "Every 2 Weeks";
      case "monthly": return "Monthly";
      default: return freq;
    }
  };

  const totalMonthlyAllowance = allowances
    .filter(a => a.is_active)
    .reduce((sum, a) => {
      const multiplier = a.frequency === "weekly" ? 4 : a.frequency === "biweekly" ? 2 : 1;
      return sum + (a.amount * multiplier);
    }, 0);

  return (
    <div className="space-y-4">
      {/* Premium Header Banner */}
      <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-0 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        <CardContent className="py-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{kidName}'s Allowance</h3>
                  <Badge className="bg-white/20 text-white border-0 text-[10px]">
                    <Crown className="h-2.5 w-2.5 mr-1" />
                    Premium
                  </Badge>
                </div>
                <p className="text-white/80 text-sm">
                  ~${totalMonthlyAllowance.toFixed(2)}/month scheduled
                </p>
              </div>
            </div>
            <Sparkles className="h-8 w-8 text-white/30" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Send Gift */}
      <Card className="border-green-200/50 dark:border-green-800/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Gift className="h-5 w-5" />
            Send a Gift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Instantly add money to {kidName}'s wallet
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 space-y-2">
              <Input
                type="number"
                placeholder="Amount ($)"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
              />
              <Input
                placeholder="Note (optional) - e.g., Birthday gift!"
                value={giftNote}
                onChange={(e) => setGiftNote(e.target.value)}
              />
            </div>
            <Button 
              onClick={sendInstantMoney} 
              disabled={isLoading || !giftAmount} 
              className="gap-2 bg-green-600 hover:bg-green-700 h-auto sm:h-full"
            >
              <Gift className="h-4 w-4" />
              Send
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[5, 10, 20, 50].map((amt) => (
              <Button
                key={amt}
                variant="outline"
                size="sm"
                className="border-green-200 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={() => setGiftAmount(amt.toString())}
              >
                ${amt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recurring Allowances */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-purple-500" />
              Recurring Allowances
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Automatic deposits on a schedule
            </p>
          </div>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-purple-500" />
                  Set Up Recurring Allowance
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="10.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={newFrequency} onValueChange={setNewFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg text-sm border border-purple-200/50">
                  <p className="font-medium mb-1 text-purple-700 dark:text-purple-300">How it works:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• Money is automatically added to {kidName}'s balance</li>
                    <li>• Deposits happen on the scheduled date</li>
                    <li>• Pause or edit anytime with the toggle/edit buttons</li>
                  </ul>
                </div>
                <Button
                  onClick={handleAddAllowance}
                  disabled={isLoading || !newAmount}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isLoading ? "Setting up..." : "Set Up Allowance"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {allowances.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="text-5xl mb-3">💰</div>
              <p className="font-medium text-foreground">No recurring allowance yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Set up automatic deposits so {kidName} receives money on a schedule
              </p>
              <Button 
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="gap-2 border-purple-200 hover:bg-purple-50"
              >
                <Plus className="h-4 w-4" />
                Add First Allowance
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {allowances.map((allowance) => (
                  <motion.div
                    key={allowance.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`relative p-4 rounded-xl border transition-all ${
                      allowance.is_active 
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800" 
                        : "bg-muted/50 border-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-2xl ${allowance.is_active ? "" : "opacity-50"}`}>
                          {allowance.is_active ? "✅" : "⏸️"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xl">${allowance.amount.toFixed(2)}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {getFrequencyLabel(allowance.frequency)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">
                            {allowance.is_active ? "Next payout" : "Paused"}
                          </p>
                          {allowance.is_active && (
                            <p className="text-sm font-medium flex items-center gap-1 justify-end">
                              <Calendar className="h-3 w-3" />
                              {new Date(allowance.next_payout_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                            onClick={() => openEditModal(allowance)}
                          >
                            <Edit2 className="h-4 w-4 text-purple-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/30"
                            onClick={() => openDeleteConfirm(allowance)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          <Switch
                            checked={allowance.is_active}
                            onCheckedChange={() => toggleAllowance(allowance)}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile next payout */}
                    {allowance.is_active && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 sm:hidden">
                        <Calendar className="h-3 w-3" />
                        Next: {new Date(allowance.next_payout_date).toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-purple-500" />
              Edit Allowance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                placeholder="10.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={newFrequency} onValueChange={setNewFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleEditAllowance}
              disabled={isLoading || !newAmount}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Allowance?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this ${selectedAllowance?.amount.toFixed(2)} {selectedAllowance?.frequency} allowance? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAllowance}
              disabled={isLoading}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split Settings */}
      <SplitSettingsCard kidId={kidId} kidName={kidName} />
    </div>
  );
};