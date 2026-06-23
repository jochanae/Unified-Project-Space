import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Check, Loader2, Sparkles } from 'lucide-react';
import { STRIPE_TIERS } from '@/hooks/useSubscription';
import { useAppContext } from '@/contexts/AppContext';
import { isAdult } from '@/lib/ageUtils';

interface InChatUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  onCheckout: (priceId: string) => Promise<void>;
  companionName?: string;
}

const plans = [
  {
    key: 'premium_monthly' as const,
    label: 'Monthly',
    price: '$14.99/mo',
    badge: null,
  },
  {
    key: 'premium_quarterly' as const,
    label: 'Quarterly',
    price: '$12.99/mo',
    badge: 'Popular',
  },
  {
    key: 'premium_yearly' as const,
    label: 'Yearly',
    price: '$9.99/mo',
    badge: 'Best Value',
  },
];

const adultPerks = [
  'Unlimited messages',
  'Up to 5 companions',
  'Full image generation',
  '🔥 Mature / Flame mode',
  'Companion photos via SMS',
];

const minorPerks = [
  'Unlimited messages',
  'Up to 5 companions',
  'Full image generation',
  '🎮 Exclusive companion activities',
  'Companion photos via SMS',
];

export default function InChatUpgradeModal({ open, onClose, onCheckout, companionName }: InChatUpgradeModalProps) {
  const { profile } = useAppContext();
  const perks = isAdult(profile?.dateOfBirth) ? adultPerks : minorPerks;
  const [selected, setSelected] = useState<keyof typeof STRIPE_TIERS>('premium_quarterly');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await onCheckout(STRIPE_TIERS[selected].price_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed inset-x-4 top-[10%] z-[60] mx-auto max-w-sm rounded-2xl border border-primary/20 bg-card p-5 shadow-2xl sm:inset-x-auto sm:w-[380px]"
          >
            {/* Close */}
            <button onClick={onClose} className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
                <Crown className="h-3.5 w-3.5" /> Premium
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Unlock everything{companionName ? ` with ${companionName}` : ''}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Go deeper — no limits, no boundaries.
              </p>
            </div>

            {/* Perks */}
            <ul className="space-y-1.5 mb-4">
              {perks.map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {p}
                </li>
              ))}
            </ul>

            {/* Plan cards */}
            <div className="space-y-2 mb-4">
              {plans.map(plan => {
                const isSelected = selected === plan.key;
                return (
                  <button
                    key={plan.key}
                    onClick={() => setSelected(plan.key)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-muted/30 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary' : 'border-muted-foreground/40'}`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium text-foreground">{plan.label}</span>
                      {plan.badge && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{plan.price}</span>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? 'Opening checkout…' : 'Upgrade Now'}
            </button>

            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Cancel anytime · Secure checkout via Stripe
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
