import { useState } from 'react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePriceAlerts, PriceAlert } from '@/hooks/usePriceAlerts';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PriceAlertsWidget() {
  const { activeAlerts, triggeredAlerts, isLoading, createAlert, deleteAlert } = usePriceAlerts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetPrice) return;

    setIsSubmitting(true);
    const result = await createAlert(symbol, parseFloat(targetPrice), direction, notes || undefined);
    setIsSubmitting(false);

    if (result) {
      setSymbol('');
      setTargetPrice('');
      setDirection('above');
      setNotes('');
      setIsDialogOpen(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const AlertItem = ({ alert, showDelete = true }: { alert: PriceAlert; showDelete?: boolean }) => (
    <div
      className={cn(
        'group flex items-center justify-between p-3 rounded-lg transition-colors',
        alert.is_triggered
          ? 'bg-gold/10 border border-gold/20'
          : 'bg-muted/30 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center',
            alert.direction === 'above' ? 'bg-gain/10' : 'bg-loss/10'
          )}
        >
          {alert.direction === 'above' ? (
            <TrendingUp className="h-4 w-4 text-gain" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{alert.symbol}</p>
            {alert.is_triggered && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-gold border-gold/30">
                Triggered
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {alert.direction === 'above' ? 'Above' : 'Below'} {formatPrice(alert.target_price)}
          </p>
        </div>
      </div>
      {showDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => deleteAlert(alert.id)}
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const headerActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Price Alert</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetPrice">Target Price</Label>
                <Input
                  id="targetPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150.00"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alert When Price Goes</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as 'above' | 'below')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-gain" />
                      Above target
                    </span>
                  </SelectItem>
                  <SelectItem value="below">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-loss" />
                      Below target
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g., Buy opportunity"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Price Alerts</span>
          {headerActions}
        </div>
      }
      description="Get notified when prices hit your targets"
      icon={<Bell className="h-5 w-5 text-gold" />}
      storageKey="dashboard-price-alerts"
    >
      <div className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : activeAlerts.length === 0 && triggeredAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No price alerts set</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="mt-1"
            >
              Create your first alert
            </Button>
          </div>
        ) : (
          <>
            {activeAlerts.slice(0, 3).map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
            {triggeredAlerts.slice(0, 2).map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
            {(activeAlerts.length > 3 || triggeredAlerts.length > 2) && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{activeAlerts.length - 3 + Math.max(0, triggeredAlerts.length - 2)} more alerts
              </p>
          )}
        </>
      )}
      </div>
    </CollapsibleCard>
  );
}
