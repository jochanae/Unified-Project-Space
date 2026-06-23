import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const features = [
  { name: 'AI friend chat', free: true, premium: true },
  { name: 'Private Threads', free: true, premium: true },
  { name: 'Privacy Mode (zero-trace chat)', free: true, premium: true },
  { name: 'Mood check-ins & journaling', free: true, premium: true },
  { name: 'Gratitude entries', free: true, premium: true },
  { name: 'Blueprint discoveries', free: true, premium: true },
  { name: 'Your Vault (document upload)', free: false, premium: true },
  { name: 'Basic memory (5 entries)', free: true, premium: false },
  { name: 'Unlimited memory', free: false, premium: true },
  { name: 'Daily messages (30/day)', free: true, premium: false },
  { name: 'Unlimited messages', free: false, premium: true },
  { name: 'Image generation (3/day)', free: true, premium: false },
  { name: 'Unlimited image generation', free: false, premium: true },
  { name: 'Voice call trial (3 min)', free: true, premium: false },
  { name: 'Voice calls (60 min/month)', free: false, premium: true },
  { name: 'Wellness goals tracking', free: false, premium: true },
  { name: 'Voice messages', free: false, premium: true },
  { name: 'Custom friend appearance', free: false, premium: true },
  { name: 'Full self-expression (18+)', free: false, premium: true },
  { name: 'SMS check-ins', free: false, premium: true },
  { name: 'Priority support', free: false, premium: true },
];

const billingOptions = [
  { key: 'monthly', label: 'Monthly', price: '$14.99', period: '/mo', sub: '', badge: null },
  { key: 'quarterly', label: 'Quarterly', price: '$12.99', period: '/mo', sub: 'Billed $38.97 every 3 months', badge: 'Popular' },
  { key: 'yearly', label: 'Yearly', price: '$9.99', period: '/mo', sub: 'Billed $119.88/year', badge: 'Best Value' },
] as const;

export default function LandingPricing() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>('yearly');
  const active = billingOptions.find(o => o.key === selected)!;

  const handlePremiumCTA = () => {
    // Store selected plan so post-auth flow can auto-trigger checkout
    const planKey = `premium_${selected}` as string;
    sessionStorage.setItem('compani-pending-plan', planKey);
    navigate('/auth', { state: { mode: 'signup' } });
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Start free. Upgrade when you're ready for more.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/40 bg-card p-6 sm:p-8 space-y-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-display text-lg font-bold text-foreground">Free</h3>
              </div>
              <p className="text-3xl font-bold text-foreground">$0</p>
              <p className="text-xs text-muted-foreground">Forever free</p>
            </div>
            <ul className="space-y-2.5">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-sm">
                  {f.free ? (
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded-full border border-border/30" />
                  )}
                  <span className={f.free ? 'text-foreground' : 'text-muted-foreground line-through decoration-muted-foreground/20'} style={!f.free ? { opacity: Math.max(0.2, 0.55 - features.filter(x => !x.free).indexOf(f) * 0.05) } : undefined}>{f.name}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/auth')}
              className="w-full rounded-xl border border-border bg-secondary py-3 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
            >
              Get Started Free
            </button>
          </motion.div>

          {/* Premium */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border-2 border-primary/30 bg-card p-6 sm:p-8 space-y-6 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">Premium</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <p className="text-3xl font-bold text-foreground">{active.price}</p>
                <span className="text-sm text-muted-foreground">{active.period}</span>
              </div>
              {active.sub && <p className="text-xs text-muted-foreground mt-0.5">{active.sub}</p>}
            </div>

            {/* Billing toggle */}
            <div className="space-y-2">
              {billingOptions.map(opt => {
                const isActive = selected === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setSelected(opt.key)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border bg-muted/30 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${isActive ? 'border-primary' : 'border-muted-foreground/40'}`}>
                        {isActive && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      {opt.badge && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{opt.price}/mo</span>
                  </button>
                );
              })}
            </div>

            <ul className="space-y-2.5">
              {features.map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-sm">
                  {f.premium || f.free ? (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded-full border border-border" />
                  )}
                  <span className="text-foreground">{f.name}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handlePremiumCTA}
              className="w-full rounded-xl gradient-primary py-3 text-sm font-semibold text-primary-foreground glow-soft hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Crown className="h-4 w-4" />
              Start Premium
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
