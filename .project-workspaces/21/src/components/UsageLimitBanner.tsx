import { Crown, MessageCircle, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FREE_LIMITS } from '@/hooks/useSubscription';

interface UsageLimitBannerProps {
  type: 'messages' | 'images';
  remaining: number;
  onDismiss?: () => void;
}

export default function UsageLimitBanner({ type, remaining, onDismiss }: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const limit = type === 'messages' ? FREE_LIMITS.DAILY_MESSAGES : FREE_LIMITS.DAILY_IMAGES;
  const Icon = type === 'messages' ? MessageCircle : ImageIcon;
  const label = type === 'messages' ? 'messages' : 'images';

  if (remaining > 10 && remaining < limit) return null; // Only show when low or at zero

  const isExhausted = remaining <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border px-4 py-3 text-center ${
        isExhausted
          ? 'border-destructive/30 bg-destructive/5'
          : 'border-primary/20 bg-primary/5'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${isExhausted ? 'text-destructive' : 'text-primary'}`} />
        <span className="text-sm font-semibold text-foreground">
          {isExhausted
            ? `Daily ${label} limit reached`
            : `${remaining} ${label} remaining today`
          }
        </span>
      </div>
      {isExhausted ? (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            Free users get {limit} {label}/day. Upgrade for unlimited.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            Upgrade to Premium
          </button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          {remaining} messages left today · Upgrade for unlimited
        </p>
      )}
    </motion.div>
  );
}
