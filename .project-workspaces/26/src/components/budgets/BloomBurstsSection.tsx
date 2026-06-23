import { useState, useEffect } from "react";
import { TrendingUp, Plus, Loader2, Trash2, Zap, Calendar, DollarSign, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LinkExpenseSheet } from "./LinkExpenseSheet";

interface BloomBurst {
  id: string;
  name: string;
  category: string;
  limit_amount: number;
  spent_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const categories = [
  { value: 'food', label: 'Food & Dining', emoji: '🍔' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { value: 'transport', label: 'Transportation', emoji: '🚗' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

const BloomBurstsSection = () => {
  const { user } = useAuth();
  const [bursts, setBursts] = useState<BloomBurst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [selectedBurst, setSelectedBurst] = useState<BloomBurst | null>(null);
  
  // Edit state
  const [editingBurst, setEditingBurst] = useState<BloomBurst | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [limitAmount, setLimitAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');

  const fetchBursts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('bloom_bursts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('end_date', { ascending: true });

      if (error) throw error;
      setBursts(data || []);
    } catch (error) {
      console.error('Error fetching bloom bursts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBursts();
  }, [user]);

  // Real-time subscription for bloom bursts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bloom-bursts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bloom_bursts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[BloomBursts] Real-time update received');
          fetchBursts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('bloom_bursts').insert({
        user_id: user.id,
        name,
        category,
        limit_amount: parseFloat(limitAmount),
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;

      toast.success('Bloom Burst created!');
      setIsOpen(false);
      resetForm();
      fetchBursts();
    } catch (error) {
      console.error('Error creating burst:', error);
      toast.error('Failed to create Bloom Burst');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bloom_bursts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bloom Burst deleted');
      fetchBursts();
    } catch (error) {
      console.error('Error deleting burst:', error);
      toast.error('Failed to delete');
    }
  };

  const openEditDialog = (burst: BloomBurst) => {
    setEditingBurst(burst);
    setName(burst.name);
    setCategory(burst.category);
    setLimitAmount(burst.limit_amount.toString());
    setStartDate(burst.start_date);
    setEndDate(burst.end_date);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBurst) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('bloom_bursts')
        .update({
          name,
          category,
          limit_amount: parseFloat(limitAmount),
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', editingBurst.id);

      if (error) throw error;

      toast.success('Bloom Burst updated!');
      setIsEditOpen(false);
      setEditingBurst(null);
      resetForm();
      fetchBursts();
    } catch (error) {
      console.error('Error updating burst:', error);
      toast.error('Failed to update Bloom Burst');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('other');
    setLimitAmount('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getCategoryEmoji = (cat: string) => {
    return categories.find(c => c.value === cat)?.emoji || '📦';
  };

  const getCategoryLabel = (cat: string) => {
    return categories.find(c => c.value === cat)?.label || 'Other';
  };

  return (
    <Card className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border-pink-200/50 dark:border-pink-800/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Bloom Bursts</h3>
              <p className="text-sm text-muted-foreground">Quick wins & spending tracker</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/30"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  Create Bloom Burst
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Weekend Budget"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.emoji} {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="limit">Spending Limit ($)</Label>
                  <Input
                    id="limit"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="100.00"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={startDate || new Date().toISOString().split('T')[0]}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : bursts.length === 0 ? (
          <div className="text-center py-6">
            <Zap className="h-12 w-12 text-purple-300 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No active Bloom Bursts yet</p>
            <Button
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Bloom Burst
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {bursts.map((burst) => {
              const progress = burst.limit_amount > 0 
                ? (burst.spent_amount / burst.limit_amount) * 100 
                : 0;
              const daysRemaining = getDaysRemaining(burst.end_date);
              const isOverBudget = progress > 100;
              const isWarning = progress > 75 && progress <= 100;
              const remaining = burst.limit_amount - burst.spent_amount;

              return (
                <Card key={burst.id} className="bg-white dark:bg-background border-purple-100 dark:border-purple-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">
                          {getCategoryEmoji(burst.category)}
                        </div>
                        <div>
                          <h4 className="font-semibold">{burst.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(burst.category)}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {daysRemaining} days left
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-purple-600"
                          onClick={() => openEditDialog(burst)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(burst.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={isOverBudget ? "text-red-500 font-medium" : "text-muted-foreground"}>
                          ${burst.spent_amount.toLocaleString()} spent
                        </span>
                        <span className="font-semibold">
                          ${burst.limit_amount.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(progress, 100)}
                        className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : "[&>div]:bg-purple-500"}`}
                      />
                      <div className="flex justify-between text-xs">
                        <span className={isOverBudget ? "text-red-500" : "text-muted-foreground"}>
                          {progress.toFixed(0)}%
                        </span>
                        <span className={isOverBudget ? "text-red-500" : "text-green-500"}>
                          {isOverBudget
                            ? `$${Math.abs(remaining).toLocaleString()} over`
                            : `$${remaining.toLocaleString()} left`}
                        </span>
                      </div>
                    </div>

                    {/* Quick add expense button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 border-purple-200 text-purple-600 hover:bg-purple-50"
                      onClick={() => {
                        setSelectedBurst(burst);
                        setLinkSheetOpen(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Log Expense
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      <LinkExpenseSheet
        open={linkSheetOpen}
        onOpenChange={setLinkSheetOpen}
        burst={selectedBurst}
        onExpenseLinked={fetchBursts}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setEditingBurst(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-purple-500" />
              Edit Bloom Burst
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Weekend Budget"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-limit">Spending Limit ($)</Label>
              <Input
                id="edit-limit"
                type="number"
                min="1"
                step="0.01"
                placeholder="100.00"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BloomBurstsSection;
