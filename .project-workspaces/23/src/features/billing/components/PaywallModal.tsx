import { useState } from 'react';
import { X, Check, Rocket, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TIERS } from '@/features/billing';
import { toast } from 'sonner';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  trigger: 'publish' | 'export';
  onCheckout: (tier: 'operator' | 'growth') => Promise<void>;
  completedSteps?: { label: string; done: boolean }[];
}

export function PaywallModal({ open, onClose, trigger, onCheckout, completedSteps }: PaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const handleCheckout = async (tier: 'operator' | 'growth') => {
    setLoading(tier);
    try {
      await onCheckout(tier);
    } catch (e) {
      toast.error('Checkout failed', { description: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setLoading(null);
    }
  };

  const steps = completedSteps || [
    { label: 'Strategy generated', done: true },
    { label: 'Funnel mapped', done: true },
    { label: 'Landing page designed', done: true },
    { label: 'Copy written by MarQ', done: true },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className={cn(
        'relative z-10 w-full max-w-xl rounded-3xl border border-primary/20',
        'bg-card/50 backdrop-blur-xl',
        'shadow-[0_0_80px_hsl(var(--primary)/0.15)]',
        'overflow-hidden',
      )} style={{ animation: 'audit-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        {/* Close */}
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 h-8 w-8 z-10" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>

        <div className="p-6 sm:p-8">
          {/* Headline */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mb-4">
              {trigger === 'publish' ? (
                <Rocket className="h-7 w-7 text-primary" />
              ) : (
                <TrendingUp className="h-7 w-7 text-primary" />
              )}
            </div>
            <h2 className="text-2xl font-[var(--font-heading)] tracking-tight mb-2">
              {trigger === 'publish' ? 'Your funnel is ready.' : 'Scale with Innovation.'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {trigger === 'publish'
                ? 'Flip it live and start capturing leads today.'
                : 'Unlock Strategic Briefings, A/B testing, and Mission Control.'}
            </p>
          </div>

          {/* Value Reminder */}
          <div className="glass rounded-xl p-4 mb-6 border border-border/20">
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                    step.done ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground',
                  )}>
                    <Check className="h-3 w-3" />
                  </div>
                  <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Cards */}
          <div className="space-y-3">
            {/* Identity (Operator) — Primary */}
            <button
              onClick={() => handleCheckout('operator')}
              disabled={loading !== null}
              className={cn(
                'w-full rounded-2xl p-5 text-left transition-all duration-300',
                'bg-primary/10 border-2 border-primary/30 hover:border-primary/50',
                'hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]',
                'group relative overflow-hidden',
              )}
            >
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/15 px-2 py-0.5 rounded-full">
                  ⭐ Most Popular
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mb-1">The Visual Architect</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl font-bold">${TIERS.operator.amount}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <h3 className="text-lg font-semibold mb-1.5">Identity <span className="text-muted-foreground font-normal text-sm">— Operator</span></h3>
              <p className="text-xs text-muted-foreground/70 mb-2 italic">Refine your brand. Make it unmistakably yours.</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Style Signal — your vibe becomes your visual DNA</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> Identity Lock across unlimited branded funnels</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary shrink-0" /> CRM, email sequences & conversion tools</li>
              </ul>
              <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all">
                {loading === 'operator' ? (
                  <Sparkles className="h-4 w-4 animate-spin" />
                ) : (
                  <>Lock Your Identity <ArrowRight className="h-4 w-4" /></>
                )}
              </div>
            </button>

            {/* Innovation (Growth) — Secondary */}
            <button
              onClick={() => handleCheckout('growth')}
              disabled={loading !== null}
              className={cn(
                'w-full rounded-2xl p-4 text-left transition-all duration-300',
                'glass border border-amber-500/30 hover:border-amber-500/50',
                'hover:shadow-[0_0_20px_hsl(40,80%,50%,0.15)]',
                'relative overflow-hidden',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/60 mb-0.5">The Chief Strategy Officer</p>
                  <p className="text-sm text-muted-foreground mb-0.5">Scale your system. Evolve your advantage.</p>
                  <p className="font-semibold">
                    Innovation — <span className="text-accent-foreground">${TIERS.growth.amount}/mo</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {loading === 'growth' ? <Sparkles className="h-4 w-4 animate-spin text-amber-400" /> : <ArrowRight className="h-4 w-4" />}
                </div>
              </div>
            </button>
          </div>

          {/* MarQ Intelligence footer */}
          <p className="text-center text-[11px] text-muted-foreground/50 mt-5 leading-relaxed italic">
            All levels include MarQ AI Intelligence. From finding your Signal to locking your Identity and scaling through Innovation — we move together.
          </p>
        </div>
      </div>
    </div>
  );
}
