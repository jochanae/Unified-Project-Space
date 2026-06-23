import { useState } from 'react';
import { Lock, Sparkles, Zap, Brain, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { toast } from 'sonner';

/**
 * Glassmorphic "AI Architect Mode" overlay shown to free-tier users
 * over the Asset Generator. Inputs underneath remain visible & disabled —
 * users can FEEL what they're locked out of.
 */
export function LockedAIArchitectOverlay({ projectName }: { projectName?: string | null }) {
  const { startCheckout } = useSubscription();
  const [loading, setLoading] = useState<'operator' | 'growth' | null>(null);

  const handleUpgrade = async (tier: 'operator' | 'growth') => {
    setLoading(tier);
    try {
      await startCheckout(tier);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout unavailable');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 p-6',
        'bg-background/40 backdrop-blur-2xl',
        'rounded-xl border border-gold/20',
        'overflow-y-auto',
      )}
    >
      {/* Animated lock badge */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse" />
        <div className="relative h-14 w-14 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-gold" />
        </div>
      </div>

      <div className="text-center space-y-1.5 max-w-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">
          AI Architect Mode · Locked
        </p>
        <h3 className="text-lg sm:text-xl font-[var(--font-heading)] text-foreground">
          MarQ is analyzing{' '}
          <span className="text-gold">{projectName ? projectName : 'your market'}</span>…
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The free generator gives you templates. <br className="hidden sm:inline" />
          AI Architect Mode injects your <strong className="text-foreground/80">Signal Lab</strong>,
          audience pain points, and brand voice into every asset.
        </p>
      </div>

      {/* Three benefit chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-md">
        {[
          { icon: Brain, label: 'Signal-aware copy' },
          { icon: Sparkles, label: 'Persona injection' },
          { icon: Zap, label: '3 angles per asset' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/40 px-2.5 py-2"
          >
            <Icon className="h-3.5 w-3.5 text-gold shrink-0" />
            <span className="text-[11px] text-foreground/80 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <button
          onClick={() => handleUpgrade('operator')}
          disabled={loading !== null}
          className={cn(
            'group flex items-center justify-center gap-2 rounded-xl px-4 py-3',
            'bg-gold text-black font-semibold text-sm',
            'shadow-[0_0_24px_-6px_hsl(var(--gold)/0.6)]',
            'hover:bg-gold/90 transition-all disabled:opacity-60',
          )}
        >
          {loading === 'operator' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Unlock Identity — $39/mo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <button
          onClick={() => handleUpgrade('growth')}
          disabled={loading !== null}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5',
            'border border-gold/30 bg-card/40 text-foreground/90 text-xs font-medium',
            'hover:border-gold/60 hover:bg-gold/5 transition-all disabled:opacity-60',
          )}
        >
          {loading === 'growth' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              Or go full Innovation · Briefing Sessions + 3 angles · $79/mo
            </>
          )}
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/60 italic text-center max-w-xs">
        Free templates still work below — but MarQ won't write copy until you upgrade.
      </p>
    </div>
  );
}
