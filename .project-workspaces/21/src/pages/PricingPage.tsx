import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useSubscription, STRIPE_TIERS } from '@/hooks/useSubscription';
import { isAdult } from '@/lib/ageUtils';

const plans = [
  {
    key: 'premium_monthly' as const,
    label: 'Monthly',
    price: '$14.99',
    unit: '/mo',
    badge: null,
  },
  {
    key: 'premium_quarterly' as const,
    label: 'Quarterly',
    price: '$12.99',
    unit: '/mo',
    sub: 'Billed $38.97 every 3 months',
    badge: 'Popular',
  },
  {
    key: 'premium_yearly' as const,
    label: 'Yearly',
    price: '$9.99',
    unit: '/mo',
    sub: 'Billed $119.88/year — save 33%',
    badge: 'Best Value',
  },
];

const adultPerks = [
  { text: 'Unlimited messages every day', emoji: '💬' },
  { text: 'Up to 5 companions', emoji: '👥' },
  { text: 'Full AI image generation', emoji: '🎨' },
  { text: 'Voice calls (60 min/month)', emoji: '📞' },
  { text: 'Unlimited Think Freely sessions', emoji: '💭' },
  { text: '🔥 Mature / Flame mode', emoji: '' },
  { text: 'Companion photos via SMS', emoji: '📱' },
  { text: 'Priority support', emoji: '⚡' },
];

const minorPerks = [
  { text: 'Unlimited messages every day', emoji: '💬' },
  { text: 'Up to 5 companions', emoji: '👥' },
  { text: 'Full AI image generation', emoji: '🎨' },
  { text: 'Voice calls (60 min/month)', emoji: '📞' },
  { text: 'Unlimited Think Freely sessions', emoji: '💭' },
  { text: '🎮 Exclusive companion activities', emoji: '' },
  { text: 'Companion photos via SMS', emoji: '📱' },
  { text: 'Priority support', emoji: '⚡' },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAppContext();
  const perks = isAdult(profile?.dateOfBirth) ? adultPerks : minorPerks;
  const { subscribed, startCheckout, openPortal, loading: subLoading } = useSubscription(user?.id);
  const [selected, setSelected] = useState<keyof typeof STRIPE_TIERS>('premium_quarterly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await startCheckout(STRIPE_TIERS[selected].price_id);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-[80svh] flex flex-col items-center px-4 py-8">
      {/* Back */}
      <div className="w-full max-w-md mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-4">
          <Crown className="h-4 w-4" /> Premium
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {subscribed ? 'Your Premium Plan' : 'Unlock the full experience'}
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          {subscribed
            ? "You're enjoying all premium features. Manage your subscription below."
            : 'Go deeper with unlimited messages, more companions, and exclusive features.'}
        </p>
      </motion.div>

      {subscribed ? (
        /* Already subscribed — show manage */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-6">
            <Crown className="h-8 w-8 text-primary mx-auto mb-3" />
            <p className="text-lg font-bold text-foreground mb-1">Premium Active</p>
            <p className="text-sm text-muted-foreground">You have access to all features.</p>
          </div>
          <button
            onClick={openPortal}
            className="w-full rounded-full border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Manage Subscription
          </button>
        </motion.div>
      ) : (
        /* Not subscribed — show plans */
        <div className="w-full max-w-md">
          {/* Perks */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5 mb-6"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Everything you get
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {perks.map(p => (
                <div key={p.text} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {p.text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Plan cards */}
          <div className="space-y-3 mb-6">
            {plans.map((plan, i) => {
              const isSelected = selected === plan.key;
              return (
                <motion.button
                  key={plan.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => setSelected(plan.key)}
                  className={`w-full flex items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/40'}`}>
                      {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{plan.label}</span>
                        {plan.badge && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      {plan.sub && <p className="text-xs text-muted-foreground mt-0.5">{plan.sub}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.unit}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            onClick={handleCheckout}
            disabled={checkoutLoading || subLoading}
            className="w-full flex items-center justify-center gap-2 rounded-full gradient-primary py-4 text-base font-bold text-primary-foreground glow-soft hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {checkoutLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {checkoutLoading ? 'Opening checkout…' : 'Upgrade Now'}
          </motion.button>

          {/* Continue free */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Continue with free plan →
          </button>

          <p className="text-[11px] text-muted-foreground/60 text-center mt-3">
            Cancel anytime · Secure checkout via Stripe
          </p>
        </div>
      )}
    </div>
  );
}
