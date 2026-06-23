import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, CalendarClock, History, Loader2, ExternalLink, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface AuditEntry {
  id: string;
  message: string;
  metadata: { action?: string; cancel_at_period_end?: boolean; period_end?: string | null; seeded?: boolean } | null;
  created_at: string;
}

interface BillingData {
  hasCustomer: boolean;
  subscription: {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    amount: number | null;
    currency: string;
    interval: string | null;
  } | null;
  upcomingInvoice: {
    amount_due: number;
    currency: string;
    next_payment_attempt: string | null;
  } | null;
  auditLog: AuditEntry[];
}

const fmtMoney = (cents: number | null | undefined, currency = 'usd') => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { subscribed, openPortal } = useSubscription(user?.id);
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadBilling = async () => {
    try {
      const { data: res, error } = await supabase.functions.invoke('billing-details');
      if (error) throw error;
      setData(res as BillingData);
    } catch (e: any) {
      console.error('Failed to load billing:', e);
      toast.error('Could not load billing details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) loadBilling();
  }, [user?.id]);

  const handleUpdateCard = async () => {
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (e: any) {
      toast.error('Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const auditIcon = (action?: string) => {
    if (action === 'canceled') return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    if (action === 'resumed') return <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  };

  return (
    <div className="min-h-[80svh] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Billing</h1>
        <p className="text-sm text-muted-foreground">Manage your payment method, invoices, and subscription history.</p>
      </motion.div>

      {loading ? (
        <div className="w-full max-w-md flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !subscribed || !data?.hasCustomer ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 text-center"
        >
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-semibold text-foreground mb-1">No active subscription</p>
          <p className="text-sm text-muted-foreground mb-4">Upgrade to Premium to unlock billing management.</p>
          <button
            onClick={() => navigate('/pricing')}
            className="rounded-full gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            See Premium plans
          </button>
        </motion.div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          {/* Update Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">Payment method</p>
                <p className="text-xs text-muted-foreground mt-0.5">Update your card or billing details securely via Stripe.</p>
              </div>
            </div>
            <button
              onClick={handleUpdateCard}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-foreground py-3 text-sm font-semibold text-background hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              {portalLoading ? 'Opening…' : 'Update card'}
            </button>
          </motion.div>

          {/* Next Invoice */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <CalendarClock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">Next invoice</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your upcoming charge from Stripe.</p>
              </div>
            </div>

            {data.subscription?.cancel_at_period_end ? (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Cancellation scheduled</p>
                <p className="text-sm text-foreground">
                  Your access ends <span className="font-semibold">{fmtDate(data.subscription.current_period_end)}</span>. No further charges.
                </p>
              </div>
            ) : data.upcomingInvoice ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    {fmtMoney(data.upcomingInvoice.amount_due, data.upcomingInvoice.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data.subscription?.interval ? `per ${data.subscription.interval}` : ''}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Charges on <span className="font-semibold text-foreground">{fmtDate(data.upcomingInvoice.next_payment_attempt)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming invoice scheduled.</p>
            )}
          </motion.div>

          {/* Audit Log */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <History className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">Activity log</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cancel and resume actions, with timestamps.</p>
              </div>
            </div>

            {data.auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No subscription activity recorded yet.</p>
            ) : (
              <ol className="space-y-3">
                {data.auditLog.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2.5 text-sm">
                    {auditIcon(entry.metadata?.action)}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-snug">{entry.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDateTime(entry.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <p className="text-[11px] text-muted-foreground/60 mt-4 leading-relaxed">
              Cancel and resume actions performed in the Stripe portal are detected and logged the next time you visit this page.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
