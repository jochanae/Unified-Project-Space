import { Crown, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  subscribed: boolean;
}

export default function PremiumGate({ feature, children, subscribed }: PremiumGateProps) {
  const navigate = useNavigate();

  if (subscribed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 blur-[2px] select-none">
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-sm p-6 text-center shadow-lg max-w-xs mx-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground mb-1">Premium Feature</h3>
          <p className="text-xs text-muted-foreground mb-4">{feature} is available with Premium. Upgrade to unlock.</p>
          <button
            onClick={() => navigate('/settings')}
            className="premium-shimmer-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition-all relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(36 80% 42%), hsl(var(--primary)), hsl(36 80% 42%))',
              color: '#000',
              letterSpacing: '0.08em',
              boxShadow: '0 4px 15px hsl(var(--primary) / 0.35)',
            }}
          >
            <span className="premium-shimmer-sweep" />
            <Crown className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">Upgrade to Premium</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
