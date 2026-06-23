import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Receipt, RotateCcw, Loader2 } from 'lucide-react';

type Order = {
  id: string;
  customer_email: string | null;
  amount_cents: number;
  refunded_cents: number;
  currency: string;
  status: string;
  product_name: string | null;
  stripe_session_id: string | null;
  created_at: string;
};

const fmt = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() })
    .format((cents || 0) / 100);

export function OrderHistory() {
  const qc = useQueryClient();
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [submitting, setSubmitting] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Order[];
    },
  });

  const openRefund = (o: Order) => {
    setRefundOrder(o);
    const remaining = (o.amount_cents - o.refunded_cents) / 100;
    setRefundAmount(remaining.toFixed(2));
    setRefundReason('requested_by_customer');
  };

  const submitRefund = async () => {
    if (!refundOrder) return;
    const cents = Math.round(parseFloat(refundAmount) * 100);
    if (!cents || cents <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { order_id: refundOrder.id, amount_cents: cents, reason: refundReason },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Refund processed');
      setRefundOrder(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      toast.error((err as Error).message || 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="glass p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Receipt className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Order History</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {orders?.length ?? 0} orders
        </Badge>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
      ) : !orders?.length ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No orders yet. Completed checkouts will appear here.
        </p>
      ) : (
        <div className="space-y-1.5">
          {orders.map((o) => {
            const remaining = o.amount_cents - o.refunded_cents;
            const isRefundable = remaining > 0 && o.status !== 'refunded';
            return (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg border border-border/20 hover:bg-muted/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {o.customer_email ?? 'Guest'}{' '}
                    {o.product_name && (
                      <span className="text-muted-foreground">· {o.product_name}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{fmt(o.amount_cents, o.currency)}</p>
                  {o.refunded_cents > 0 && (
                    <p className="text-[10px] text-amber-400">
                      −{fmt(o.refunded_cents, o.currency)} refunded
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={
                    o.status === 'paid'
                      ? 'border-emerald-500/30 text-emerald-400'
                      : o.status === 'refunded'
                      ? 'border-red-500/30 text-red-400'
                      : 'border-amber-500/30 text-amber-400'
                  }
                >
                  {o.status}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!isRefundable}
                  onClick={() => openRefund(o)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Refund
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!refundOrder} onOpenChange={(o) => !o && setRefundOrder(null)}>
        <DialogContent className="max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Refund order</DialogTitle>
            <DialogDescription>
              {refundOrder?.customer_email ?? 'Guest'} ·{' '}
              {refundOrder && fmt(refundOrder.amount_cents, refundOrder.currency)} total
              {refundOrder && refundOrder.refunded_cents > 0 && (
                <> · {fmt(refundOrder.refunded_cents, refundOrder.currency)} already refunded</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Amount ({(refundOrder?.currency || 'usd').toUpperCase()})</Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Reason</Label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              >
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRefundOrder(null)}>
              Cancel
            </Button>
            <Button onClick={submitRefund} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              Process refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
