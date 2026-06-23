import { useNavigate } from 'react-router-dom';
import { AppFooter } from '@/components/shared/AppFooter';
import { LogoCapsule } from '@/components/shared/LogoCapsule';
import { Check, ArrowRight, TrendingUp, Rocket, Radar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { ParticleMesh } from '@/components/ui/particle-mesh';
import { cn } from '@/lib/utils';
import { useSubscription, TIERS } from '@/features/billing';
import { useAuth } from '@/features/auth';
import { toast } from 'sonner';
import { useState } from 'react';

const tiers = [
  {
    id: 'architect' as const,
    name: 'Signal',
    subtitle: 'Architect',
    tagline: 'Clarify your message. Build your foundation.',
    price: 0,
    interval: null,
    highlight: false,
    features: [
      'MarQ AI intelligence (core)',
      '3-question Signal flow',
      'Value proposition generator',
      'Audience definition helper',
      'Single funnel creation',
      'Basic page builder (Hero, Problem, Solution, CTA)',
      'Messaging & hook optimization',
      'Logo Generator with brand templates',
      'Funnel templates library',
    ],
    locked: [
      'Style Signal (vibe system)',
      'Cannot publish live',
      'Cannot capture leads',
    ],
    cta: 'Start Free',
  },
  {
    id: 'operator' as const,
    name: 'Identity',
    subtitle: 'Operator',
    tagline: 'Refine your brand. Make it unmistakably yours.',
    price: TIERS.operator.amount,
    interval: '/mo',
    highlight: true,
    features: [
      'Everything in Signal',
      'Style Signal — describe your vibe, get a brand system',
      'Identity Lock (palette, typography, mood)',
      'Publish unlimited funnels',
      'Fully branded page design',
      'Rich embeds (YouTube, TikTok, Calendly, HeyGen)',
      'Capture leads in real-time',
      'CRM pipeline & contacts',
      'Email sequences & subscriber intelligence',
      'Social marketing toolkit & export',
      'Funnel analytics & Pulse Command Map',
      'MarQ IQ Audits & tone refinement',
    ],
    locked: [],
    cta: 'Lock Your Identity',
  },
  {
    id: 'growth' as const,
    name: 'Innovation',
    subtitle: 'Growth',
    tagline: 'Scale your system. Evolve your advantage.',
    price: TIERS.growth.amount,
    interval: '/mo',
    highlight: false,
    features: [
      'Everything in Identity',
      'A/B test headlines & CTAs',
      'Multi-funnel systems',
      'Custom domain per project',
      'AI-generated social images',
      'Advanced analytics & experiments',
      'Experiment dashboard',
      'MarQ performance recommendations',
      'Export funnel code bundle',
      'Priority AI generation',
    ],
    locked: [],
    cta: 'Scale Up',
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { subscribed, tier: currentSubTier, startCheckout, openPortal } = useSubscription();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (tierId: string) => {
    if (tierId === 'architect') {
      navigate('/login');
      return;
    }
    setLoading(tierId);
    try {
      if (tierId === 'operator') {
        await startCheckout('operator');
      } else {
        await startCheckout('growth');
      }
    } catch (e) {
      toast.error('Checkout failed', { description: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setLoading(null);
    }
  };

  const currentTier = currentSubTier === 'growth' ? 'growth' : subscribed ? 'operator' : 'architect';

  return (
    <div className="min-h-screen animated-gradient text-foreground relative overflow-x-hidden">
      <ParticleMesh />

      {/* Nav */}
      <nav
        className="flex items-center justify-between py-4 relative z-20"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 20px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 20px)',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
        }}
      >
        <LogoCapsule
          size="sm"
          onClick={() => navigate(isLoggedIn ? '/projects' : '/')}
          className="bg-transparent border-0 shadow-none px-0 py-0 hover:shadow-none"
        />
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/projects')}>
              ← Back to Projects
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          )}
          {subscribed && (
            <Button variant="outline" size="sm" onClick={openPortal}>
              Manage
            </Button>
          )}
        </div>
      </nav>

      {/* Header */}
      <section className="relative px-5 sm:px-6 lg:px-12 pt-8 sm:pt-16 pb-6 sm:pb-12 text-center z-10">
        <ScrollReveal>
          <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-xs sm:text-sm text-primary font-medium tracking-widest uppercase mb-5">
            Signal → Identity → Innovation
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif mb-4">
            From Clarity to Scale.{' '}
            <span className="gradient-text italic">Your Journey.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            A system that turns ideas into identity-driven, scalable businesses.
          </p>
        </ScrollReveal>
      </section>

      {/* Tier Cards */}
      <section className="relative px-4 sm:px-6 lg:px-12 pb-20 z-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tiers.map((tier, i) => {
            const isCurrent = currentTier === tier.id;
            return (
              <ScrollReveal key={tier.id} delay={i * 120}>
                <div className={cn(
                  'glass rounded-2xl flex flex-col h-full relative transition-all duration-300',
                  tier.highlight
                    ? 'pt-5 px-5 pb-5 sm:pt-7 sm:px-7 sm:pb-7 mt-4 sm:mt-0 border border-primary/50 shadow-[0_0_50px_hsl(var(--primary)/0.15),0_0_20px_hsl(var(--primary)/0.08),inset_0_1px_0_hsl(var(--primary)/0.15)]'
                    : 'p-5 sm:p-7 border border-border/30',
                  isCurrent && 'ring-2 ring-primary/50',
                )}>
                  {/* Current badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                        Your Plan
                      </span>
                    </div>
                  )}

                  {/* Popular badge */}
                  {tier.highlight && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-primary/50 whitespace-nowrap shadow-[0_0_16px_hsl(var(--primary)/0.35),0_0_4px_hsl(var(--primary)/0.2)] backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" /> Most Popular
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    'h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4',
                    tier.id === 'architect' && 'bg-muted',
                    tier.id === 'operator' && 'bg-primary/15 border border-primary/25',
                    tier.id === 'growth' && 'bg-accent/15 border border-accent/25',
                  )}>
                    {tier.id === 'architect' && <Radar className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />}
                    {tier.id === 'operator' && <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
                    {tier.id === 'growth' && <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />}
                  </div>

                  {/* Name + subtitle + tagline */}
                  <h3 className="text-lg sm:text-xl font-serif mb-0.5">{tier.name}</h3>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">({tier.subtitle})</span>
                  <p className="text-xs text-muted-foreground italic mb-3 sm:mb-4">{tier.tagline}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-4 sm:mb-5">
                    <span className="text-2xl sm:text-3xl font-bold">${tier.price}</span>
                    {tier.interval && (
                      <span className="text-sm text-muted-foreground">{tier.interval}</span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-5 sm:mb-6 flex-1">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {tier.locked.map((f, j) => (
                      <li key={`locked-${j}`} className="flex items-start gap-2 text-sm text-muted-foreground/50 line-through">
                        <span className="h-4 w-4 shrink-0 mt-0.5 text-center">✕</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    onClick={() => isCurrent ? (subscribed ? openPortal() : null) : handleSelect(tier.id)}
                    disabled={loading !== null}
                    className={cn(
                      'w-full gap-2',
                      tier.highlight ? 'glow-button' : '',
                      isCurrent && 'bg-muted text-foreground hover:bg-muted',
                    )}
                    variant={tier.highlight ? 'default' : 'outline'}
                  >
                    {loading === tier.id ? (
                      <Sparkles className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      subscribed ? 'Manage Plan' : 'Current Plan'
                    ) : (
                      <>{tier.cta} <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Bottom note */}
        <ScrollReveal delay={400}>
          <p className="text-center text-xs text-muted-foreground/50 mt-8 max-w-md mx-auto">
            All plans include MarQ AI intelligence. Signal → Identity → Innovation. Upgrade or cancel anytime.
          </p>
        </ScrollReveal>
      </section>

      <AppFooter variant="marketing" />
    </div>
  );
}
