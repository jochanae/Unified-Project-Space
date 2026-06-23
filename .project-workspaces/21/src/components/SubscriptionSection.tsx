import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles, Loader2, ShieldCheck, ExternalLink } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { useSubscription, STRIPE_TIERS } from '@/hooks/useSubscription';
import { useAdminSettingText } from '@/hooks/useAdminSettings';
import { toast } from 'sonner';
import AgeVerificationDialog from './AgeVerificationDialog';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionSectionProps {
  userId: string | undefined;
}

function useSupportContactUrl() {
  const [url, setUrl] = useState('');
  useEffect(() => {
    supabase
      .from('admin_settings' as any)
      .select('value')
      .eq('key', 'support_contact_url')
      .single()
      .then(({ data }) => {
        if (data) {
          const raw = (data as any).value;
          if (typeof raw === 'string' && raw.length > 0) setUrl(raw);
        }
      });
  }, []);
  return url;
}

export default function SubscriptionSection({ userId }: SubscriptionSectionProps) {
  const {
    subscribed, isAdminSub, priceId, subscriptionEnd, loading,
    startCheckout, startDonation, openPortal, checkSubscription,
  } = useSubscription(userId);

  const supportUrl = useSupportContactUrl();
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [donationLoading, setDonationLoading] = useState(false);

  const activeAmount = customAmount ? parseFloat(customAmount) : donationAmount;
  const isValidDonation = activeAmount >= 1 && activeAmount <= 1000 && !isNaN(activeAmount);

  const handleDonate = async () => {
    if (!isValidDonation) return;
    setDonationLoading(true);
    try {
      await startDonation(activeAmount);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDonationLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const tierMap = {
        monthly: STRIPE_TIERS.premium_monthly,
        quarterly: STRIPE_TIERS.premium_quarterly,
        yearly: STRIPE_TIERS.premium_yearly,
      };
      await startCheckout(tierMap[selectedBilling].price_id);
    } catch (e: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Crown className="h-3.5 w-3.5" /> Subscription
        </h3>
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-4">
          {subscribed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  {isAdminSub ? (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isAdminSub ? 'Admin Premium' : 'Premium Active'}
                  </p>
                  {subscriptionEnd && !isAdminSub && (
                    <p className="text-xs text-muted-foreground">
                      Renews {new Date(subscriptionEnd).toLocaleDateString()}
                    </p>
                  )}
                  {isAdminSub && (
                    <p className="text-xs text-muted-foreground">
                      Granted by administrator
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isAdminSub && (
                  <a
                    href="/billing"
                    onClick={(e) => { e.preventDefault(); window.location.assign('/billing'); }}
                    className="flex-1 min-w-[100px] rounded-xl border border-border/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors text-center"
                  >
                    Billing & Invoice
                  </a>
                )}
                {!isAdminSub && (
                  <button
                    onClick={openPortal}
                    className="flex-1 min-w-[100px] rounded-xl border border-border/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    Manage
                  </button>
                )}
                <button
                  onClick={checkSubscription}
                  className={`rounded-xl border border-border/40 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary transition-colors ${isAdminSub ? 'flex-1' : ''}`}
                >
                  Refresh
                </button>
              </div>
              {supportUrl && (
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Need help? Contact us <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <Sparkles className="h-6 w-6 text-primary mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">Upgrade to Premium</p>
                <p className="text-xs text-muted-foreground">Unlock unlimited messages, images & more</p>
              </div>

              {/* Billing toggle */}
              <div className="flex items-center justify-center gap-1 rounded-xl bg-secondary/50 p-1">
                {(['monthly', 'quarterly', 'yearly'] as const).map((billing) => (
                  <button
                    key={billing}
                    onClick={() => setSelectedBilling(billing)}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                      selectedBilling === billing
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {billing === 'monthly' ? 'Monthly' : billing === 'quarterly' ? <>Quarterly <span className="text-primary text-[10px]">-13%</span></> : <>Yearly <span className="text-primary text-[10px]">-33%</span></>}
                  </button>
                ))}
              </div>

              {/* Price display */}
              <div className="text-center">
                <span className="text-3xl font-bold text-foreground">
                  ${selectedBilling === 'yearly' ? '9.99' : selectedBilling === 'quarterly' ? '12.99' : '14.99'}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
                {selectedBilling === 'yearly' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Billed $119.88/year</p>
                )}
                {selectedBilling === 'quarterly' && (
                  <p className="text-xs text-muted-foreground mt-0.5">Billed $38.97 every 3 months</p>
                )}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setAgeGateOpen(true)}
                disabled={checkoutLoading}
                className="premium-shimmer-btn w-full rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(36 80% 42%), hsl(var(--primary)), hsl(36 80% 42%))',
                  color: '#000',
                  letterSpacing: '0.08em',
                  boxShadow: '0 4px 15px hsl(var(--primary) / 0.35)',
                }}
              >
                <span className="premium-shimmer-sweep" />
                {checkoutLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                ) : (
                  <>
                    <Crown className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Subscribe Now</span>
                  </>
                )}
              </motion.button>

              <AgeVerificationDialog
                open={ageGateOpen}
                onOpenChange={setAgeGateOpen}
                onVerified={handleSubscribe}
              />
            </div>
          )}
        </div>
      </section>
      {/* Support Us */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <AnimatedGradientHeart size={14} id="settings-support-heart" /> Support Us
        </h3>
        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Love Compani? Help us keep it running with a one-time contribution. 💛
          </p>
          {/* Preset amounts */}
          <div className="flex gap-2">
            {[5, 10, 25].map((amt) => (
              <button
                key={amt}
                onClick={() => { setDonationAmount(amt); setCustomAmount(''); }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  !customAmount && donationAmount === amt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/40 text-muted-foreground hover:bg-secondary'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
          {/* Custom amount input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <input
              type="number"
              min="1"
              max="1000"
              step="0.01"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="w-full rounded-xl border border-border/40 bg-background pl-7 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleDonate}
            disabled={donationLoading || !isValidDonation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {donationLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <AnimatedGradientHeart size={16} id="settings-support-btn" />
                Support Us — ${isValidDonation ? activeAmount.toFixed(2) : '...'}
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
