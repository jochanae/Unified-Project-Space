import { useState, useEffect } from "react";
import { Zap, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  { value: 'food', label: 'Food & Dining' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'transport', label: 'Transportation' },
  { value: 'other', label: 'Other' },
];

export const BloomBurstsCardContent = () => {
  const { user } = useAuth();
  const [bursts, setBursts] = useState<BloomBurst[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      .channel('dashboard-bloom-bursts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bloom_bursts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Dashboard BloomBursts] Real-time update received');
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
      setName('');
      setCategory('other');
      setLimitAmount('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
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

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Temporary spending limits</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" className="h-6 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Bloom Burst</DialogTitle>
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
                        {c.label}
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
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {bursts.length === 0 ? (
        <div className="text-center py-4">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No active Bloom Bursts</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {bursts.slice(0, 2).map((burst) => {
            const progress = burst.limit_amount > 0 
              ? (burst.spent_amount / burst.limit_amount) * 100 
              : 0;
            const daysRemaining = getDaysRemaining(burst.end_date);
            const isOverBudget = progress > 100;

            return (
              <div key={burst.id} className="p-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{burst.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleDelete(burst.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
                <Progress 
                  value={Math.min(progress, 100)} 
                  className={`h-1.5 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                />
                <div className="flex justify-between mt-1">
                  <span className={`text-[10px] ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                    ${burst.spent_amount.toFixed(0)} / ${burst.limit_amount.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {daysRemaining} days left
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
