import { Crown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface UpgradeBannerProps {
  subscribed: boolean;
  variant?: 'home' | 'chat';
}

export default function UpgradeBanner({ subscribed, variant = 'home' }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (subscribed || dismissed) return null;

  const isChat = variant === 'chat';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        role="button"
        tabIndex={0}
        onClick={() => navigate('/pricing')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/pricing'); } }}
        className={`group relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-3 text-left transition-all hover:bg-primary/10 hover:border-primary/30 ${isChat ? 'mx-auto max-w-md' : ''}`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Unlock Premium</p>
          <p className="text-[11px] text-muted-foreground truncate">
            Unlimited messages, multiple companions & more
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-primary opacity-70 group-hover:opacity-100 transition-opacity">
          View plans →
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
