import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, PartyPopper, CheckCircle2 } from 'lucide-react';

interface Props {
  onRefreshSubscription: () => Promise<void>;
}

export function CheckoutSuccess({ onRefreshSubscription }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [show, setShow] = useState(false);
  const [tier, setTier] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      const t = searchParams.get('tier') || 'Operator';
      setTier(t);
      setShow(true);

      // Refresh subscription state
      onRefreshSubscription();

      // Clean URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('checkout');
      newParams.delete('tier');
      setSearchParams(newParams, { replace: true });

      // Auto-dismiss after 5s
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, setSearchParams, onRefreshSubscription]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full animate-confetti"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-5%`,
              backgroundColor: ['hsl(var(--primary))', '#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7'][i % 5],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Celebration card */}
      <div className="glass rounded-2xl p-8 sm:p-10 text-center max-w-md mx-4 pointer-events-auto animate-scale-in border border-primary/30 shadow-[0_0_60px_-10px_hsl(var(--primary)/0.4)]">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-primary animate-bounce" />
          </div>
        </div>
        <h2 className="text-2xl font-serif mb-2">
          Welcome,{' '}
          <span className="gradient-text italic">{tier}</span>
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          Your upgrade is active. All gated features are now unlocked.
        </p>
        <div className="flex flex-col gap-2 text-left max-w-xs mx-auto">
          {tier === 'Growth' ? (
            <>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> A/B testing for headlines & CTAs</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Custom domain for your funnels</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> AI-generated social media images</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Priority AI generation</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Deploy live funnels</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Capture leads in real-time</div>
              <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> CRM, email & analytics</div>
            </>
          )}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-primary text-xs">
          <Sparkles className="h-3 w-3" />
          <span>Auto-closing in a moment…</span>
        </div>
      </div>
    </div>
  );
}
